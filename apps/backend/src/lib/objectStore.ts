// === IMPORTS ===
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

export const objectStoreClient = new S3Client({
  endpoint: env.OBJECT_STORE_ENDPOINT,
  region: "us-east-1", // MinIO/most S3-compatible stores ignore this but the SDK requires a value
  forcePathStyle: true, // required for MinIO and most non-AWS S3-compatible endpoints
  credentials: {
    accessKeyId: env.OBJECT_STORE_ACCESS_KEY,
    secretAccessKey: env.OBJECT_STORE_SECRET_KEY,
  },
});

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

// TIER 3 — PDPP Art. 22 DATA LOCALIZATION BLOCKER:
// This objectStoreClient is configured to connect to a local MinIO instance
// (OBJECT_STORE_ENDPOINT env var). For production, the primary bucket MUST
// be hosted on an Ethiopian cloud provider (Ethio Telecom Cloud or Safaricom
// Ethiopia) to comply with PDPP No. 1321/2024 Art. 22 data localization.
// Cross-border backups require ECA approval and signed Standard Contractual
// Clauses. DO NOT point OBJECT_STORE_ENDPOINT at a foreign-hosted bucket
// (AWS S3, Azure Blob, GCP) to make this look resolved — it isn't.
// See COMPLIANCE_BLOCKERS.md §Data Localization for the full blocker details.
