import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export const objectStoreClient = new S3Client({
  endpoint: env.OBJECT_STORE_ENDPOINT,
  region: "us-east-1", // MinIO/most S3-compatible stores ignore this but the SDK requires a value
  forcePathStyle: true, // required for MinIO and most non-AWS S3-compatible endpoints
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

// TIER 3 — PDPP Art. 22 DATA LOCALIZATION BLOCKER:
// This objectStoreClient is configured to connect to a local MinIO instance
// (OBJECT_STORE_ENDPOINT env var). For production, the primary bucket MUST
// be hosted on an Ethiopian cloud provider (Ethio Telecom Cloud or Safaricom
// Ethiopia) to comply with PDPP No. 1321/2024 Art. 22 data localization.
// Cross-border backups require ECA approval and signed Standard Contractual
// Clauses. DO NOT point OBJECT_STORE_ENDPOINT at a foreign-hosted bucket
// (AWS S3, Azure Blob, GCP) to make this look resolved — it isn't.
// See COMPLIANCE_BLOCKERS.md §Data Localization for the full blocker details.
