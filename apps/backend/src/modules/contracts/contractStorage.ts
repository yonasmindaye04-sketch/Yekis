// === IMPORTS ===
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ensureObjectStoreBucket, objectStoreClient } from "../../lib/objectStore.js";
import { env } from "../../config/env.js";

/**
 * Contracts are stored immutably — this key is never overwritten. If a
 * contract is ever regenerated (e.g. a future amendment flow), that must
 * create a new object and a new Contract row referencing it, never mutate
 * the bytes behind an existing storagePath.
 */

// === MAIN FUNCTIONS ===
export async function uploadContractDocument(params: { jobId: string; fileBuffer: Buffer }): Promise<string> {
  await ensureObjectStoreBucket();
  const key = `contracts/${params.jobId}/service-agreement-${Date.now()}.pdf`;

  await objectStoreClient.send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORE_BUCKET,
      Key: key,
      Body: params.fileBuffer,
      ContentType: "application/pdf",
    })
  );

  return key;
}
