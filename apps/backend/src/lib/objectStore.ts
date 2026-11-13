import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const objectStoreClient = new S3Client({
  endpoint: env.OBJECT_STORE_ENDPOINT,
  // MinIO and most S3-compatible stores ignore the region, but the SDK
  // requires a value and a hosted store may not. The region is configurable
  // because the platform's own region is not `us-east-1` — AletCloud's is
  // `et-addis-1` — and a mismatch there is a confusing 400 rather than an
  // obvious failure.
  region: env.OBJECT_STORE_REGION,
  // Path-style addressing (`endpoint/bucket/key`) is what MinIO requires.
  // A hosted S3-compatible endpoint may only offer virtual-host style
  // (`bucket.endpoint/key`), so this is configurable rather than fixed.
  forcePathStyle: env.OBJECT_STORE_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.OBJECT_STORE_ACCESS_KEY,
    secretAccessKey: env.OBJECT_STORE_SECRET_KEY,
  },
});

export async function ensureObjectStoreReady(): Promise<void> {
  try {
    await objectStoreClient.send(
      new HeadBucketCommand({ Bucket: env.OBJECT_STORE_BUCKET }),
    );
    logger.info({ bucket: env.OBJECT_STORE_BUCKET }, "Object store bucket is ready.");
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
      try {
        await objectStoreClient.send(
          new CreateBucketCommand({ Bucket: env.OBJECT_STORE_BUCKET }),
        );
        logger.info(
          { bucket: env.OBJECT_STORE_BUCKET },
          "Created missing object store bucket successfully.",
        );
      } catch (createErr) {
        logger.error({ err: createErr }, "Failed to create object store bucket.");
      }
    } else {
      logger.warn({ err }, "Could not reach object store at startup — will retry on upload.");
    }
  }
}

/**
 * Uploads a KYC document under a per-user, per-document-type key. Returns
 * the storage key (not a public URL) — the object store bucket should have
 * no public read access; use getKycDocumentUrl() below to generate a
 * short-lived signed URL only when a reviewer actually needs to view it.
 */

// === MAIN FUNCTIONS ===
export async function uploadKycDocument(params: {
  userId: string;
  documentType: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<string> {
  const key = `kyc-documents/${params.userId}/${params.documentType}/${randomUUID()}`;

  await objectStoreClient.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: key,
      Body: params.fileBuffer,
      ContentType: params.contentType,
      // Server-side encryption should be enforced at the bucket policy level
      // in staging/production, not just per-request here.
    }),
  );

  return key;
}

/**
 * Uploads a wallet top-up receipt photo — same private-bucket, signed-URL-
 * only access pattern as KYC documents.
 */
export async function uploadTopUpReceipt(params: {
  userId: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<string> {
  const key = `topup-receipts/${params.userId}/${randomUUID()}`;
  await objectStoreClient.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: key,
      Body: params.fileBuffer,
      ContentType: params.contentType,
    }),
  );
  return key;
}

export async function uploadProposalAttachment(params: {
  jobId: string;
  userId: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<string> {
  const key = `proposal-attachments/${params.jobId}/${params.userId}/${randomUUID()}`;
  await objectStoreClient.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: key,
      Body: params.fileBuffer,
      ContentType: params.contentType,
    }),
  );
  return key;
}

export async function getProposalAttachmentUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.OBJECT_STORE_BUCKET,
    Key: key,
  });
  return getSignedUrl(objectStoreClient, command, { expiresIn: 3600 });
}


/**
 * Generic signed-URL generator — getKycDocumentUrl below is a thin,
 * backward-compatible wrapper so existing imports keep working unchanged.
 */
export async function getSignedObjectUrl(
  storageKey: string,
  expiresInSeconds = 300,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.OBJECT_STORE_BUCKET,
    Key: storageKey,
  });
  return getSignedUrl(objectStoreClient, command, {
    expiresIn: expiresInSeconds,
  });
}

/**
 * Short-lived signed URL for a reviewer (Compliance Officer) to view a
 * document during manual review. Never store or log this URL — it's
 * time-boxed and should be requested fresh each time it's needed.
 */
export async function getKycDocumentUrl(
  storageKey: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedObjectUrl(storageKey, expiresInSeconds);
}

/**
 * T2-G: Uploads a compiled evidence bundle (JSON) for a dispute to the object
 * store. Returns the storage key (not a public URL). The bundle includes
 * contract terms, evidence statements, and the direct message log.
 */
export async function uploadEvidenceBundle(params: {
  disputeId: string;
  fileBuffer: Buffer;
}): Promise<string> {
  const key = `dispute-evidence/${params.disputeId}/bundle-${Date.now()}.json`;

  await objectStoreClient.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: key,
      Body: params.fileBuffer,
      ContentType: "application/json",
    }),
  );

  return key;
}

/**
 * Uploads a chat attachment. Stores in object store with local disk backup
 * and returns the storage key.
 */
export async function uploadChatAttachment(params: {
  userId: string;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<string> {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  // The key is deliberately opaque: it must NOT contain the uploader's user id.
  // Attachment URLs are handed to browsers, proxies and access logs, so an
  // internal identifier embedded in the path leaks it to every hop and makes
  // keys enumerable by user. Ownership is enforced in the serving route, which
  // resolves the key back to its conversation and checks access.
  //
  // The first two hex characters shard the object store so a single prefix does
  // not become a hot partition.
  //
  // `params.userId` is still required by the signature and used for the local
  // backup path only; it never reaches the object key.
  const id = randomUUID();
  const shard = id.slice(0, 2);
  const key = `chat-attachments/${shard}/${id}-${safeName}`;

  try {
    await objectStoreClient.send(
      new PutObjectCommand({
        Bucket: env.OBJECT_STORE_BUCKET,
        Key: key,
        Body: params.fileBuffer,
        ContentType: params.contentType,
      }),
    );
  } catch (err) {
    logger.warn({ err, key }, "Failed to upload chat attachment to object store, saving locally");
  }

  // Also write to local storage as fallback. getChatAttachmentStream resolves
  // local files by mirroring the storage key, so this must keep the same shape.
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const localDir = path.resolve(
      process.cwd(),
      "uploads",
      "chat-attachments",
      shard,
    );
    await fs.mkdir(localDir, { recursive: true });
    const localFile = path.resolve(localDir, path.basename(key));
    await fs.writeFile(localFile, params.fileBuffer);
  } catch (err) {
    logger.warn({ err }, "Could not write chat attachment to local backup");
  }

  return key;
}

export async function getChatAttachmentStream(storageKey: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: storageKey,
    });
    const response = await objectStoreClient.send(command);
    return {
      stream: response.Body as import("node:stream").Readable,
      contentType: response.ContentType || "application/octet-stream",
      contentLength: response.ContentLength,
    };
  } catch (err) {
    // Try local backup
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const localFile = path.resolve(process.cwd(), "uploads", ...storageKey.split("/"));
      if (fs.existsSync(localFile)) {
        const stat = fs.statSync(localFile);
        return {
          stream: fs.createReadStream(localFile),
          contentType: "application/octet-stream",
          contentLength: stat.size,
        };
      }
    } catch {}
    throw err;
  }
}

/**
 * Deletes an object from the store, and removes the local-disk backup too.
 *
 * Added for PDPP data erasure: wiping the database row is not enough when
 * the bytes themselves are personal data — a chat attachment left in the
 * bucket (or in the `uploads/` fallback directory) is still the data subject's
 * data, and still readable by anyone holding the key.
 *
 * The local backup matters as much as the bucket. `uploadChatAttachment`
 * writes every attachment to disk as well, and `getChatAttachmentStream`
 * falls back to that copy when the bucket is unreachable — so deleting only
 * the bucket object would leave the file fully readable through the API.
 *
 * Deletion is best-effort by design: a missing object is already gone, and a
 * store that is down must not abort the erasure of the database rows. The
 * return value says what actually happened so the caller can record it.
 *
 * NOTE ON WORM STORAGE: if object lock is later enabled in compliance mode,
 * the store will reject the delete rather than removing the bytes, and a
 * delete marker may be written instead. That is the correct behaviour for a
 * locked bucket — the retention period wins — but it means an erasure in a
 * WORM-configured environment needs a separate retention-exception process.
 */
export async function deleteObject(
  storageKey: string,
): Promise<{ bucketDeleted: boolean; localBackupDeleted: boolean; reason?: string }> {
  let bucketDeleted = false;
  let localBackupDeleted = false;
  let reason: string | undefined;

  try {
    await objectStoreClient.send(
      new DeleteObjectCommand({
        Bucket: env.OBJECT_STORE_BUCKET,
        Key: storageKey,
      }),
    );
    bucketDeleted = true;
  } catch (err) {
    // NoSuchKey means it is already gone, which is the desired end state.
    const name = (err as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") {
      bucketDeleted = true;
    } else {
      reason = name ?? "delete_failed";
      logger.warn({ err, storageKey }, "Failed to delete object from object store");
    }
  }

  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const localFile = path.resolve(
      process.cwd(),
      "uploads",
      ...storageKey.split("/"),
    );
    await fs.rm(localFile, { force: true });
    localBackupDeleted = true;
  } catch (err) {
    logger.warn({ err, storageKey }, "Failed to delete local object-store backup");
  }

  return { bucketDeleted, localBackupDeleted, reason };
}

// TIER 3 — PDPP Art. 22 DATA LOCALIZATION BLOCKER:
// This objectStoreClient is configured to connect to a local MinIO instance
// (OBJECT_STORE_ENDPOINT env var). For production, the primary bucket MUST
// be hosted on an Ethiopian cloud provider (Ethio Telecom Cloud or Safaricom
// Ethiopia) to comply with PDPP No. 1321/2024 Art. 22 data localization.
// Cross-border backups require ECA approval and signed Standard Contractual
// Clauses. DO NOT point OBJECT_STORE_ENDPOINT at a foreign-hosted bucket
// (AWS S3, Azure Blob, GCP) to make this look resolved — it isn't.
// See COMPLIANCE_BLOCKERS.md §Data Localization for the full blocker details.
//
// RESOLUTION PATH (2026-11-12)
// AletCloud is a candidate that satisfies the requirement on its face: its
// own hardware, inside Ethio Telecom's Bole data centre in Addis Ababa, with
// an S3-compatible object store at s3.aletcloud.com and the region
// `et-addis-1`. A bucket there is set with:
//
//   OBJECT_STORE_ENDPOINT=https://s3.aletcloud.com
//   OBJECT_STORE_REGION=et-addis-1
//   OBJECT_STORE_BUCKET=<bucket>
//   OBJECT_STORE_ACCESS_KEY / OBJECT_STORE_SECRET_KEY=<the scoped key>
//
// The AWS_* names AletCloud injects when a bucket is linked to an app
// (AWS_ENDPOINT_URL, AWS_REGION, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY) are accepted as aliases, so a linked bucket needs
// no renaming — see `applyObjectStoreAliases()` in config/env.ts.
//
// The region is not cosmetic. A bucket in Addis Ababa served to clients
// outside Ethiopia is still a cross-border transfer of the personal data in
// it, and that is a separate approval, not an infrastructure detail.
