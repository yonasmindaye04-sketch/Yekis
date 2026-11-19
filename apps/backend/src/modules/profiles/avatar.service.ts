// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

/**
 * Uploaded profile photos.
 *
 * `User.avatarUrl` is a VARCHAR(500) and is read by chat, contract, gig and
 * featured queries, so it must stay a URL. The bytes live in `UserAvatar` and
 * are served from `/api/v1/users/avatars/:id`, which is public (public profile
 * pages render for signed-out visitors) and cacheable forever because an id is
 * never reused: replacing a photo creates a new row and deletes the old one.
 *
 * This also keeps avatars independent of the object store. KYC documents and
 * chat attachments are private and belong behind signed URLs; a profile photo
 * is public content, and serving it from the database means a bucket outage
 * cannot blank every avatar on the site.
 */

/** Max bytes accepted for an avatar upload. The client compresses to ~320px JPEG. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Short, stable prefix stored in `User.avatarUrl`. */
export const AVATAR_URL_PREFIX = "/api/v1/users/avatars/";

const AVATAR_ID_RE = /^[a-z0-9]{20,40}$/;

/** Raised for a client mistake; the route maps `statusCode` onto the response. */
export class AvatarValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "AvatarValidationError";
  }
}

/**
 * Recognises the image formats the platform is willing to serve.
 *
 * The declared MIME type is not trusted: a browser can label anything
 * `image/jpeg`. The signature decides, and only raster formats that every
 * browser renders safely are accepted. SVG is deliberately excluded — it is a
 * document that can carry script, and serving user-uploaded SVG from the API
 * origin would be stored XSS. GIF is excluded because a canvas-compressed
 * avatar is a still image; accepting animation would also bypass the size
 * expectation.
 */
export function detectImageContentType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG)) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Extracts the avatar id from a URL this platform issued, or null. */
export function avatarIdFromUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(AVATAR_URL_PREFIX)) return null;
  const id = url.slice(AVATAR_URL_PREFIX.length);
  return AVATAR_ID_RE.test(id) ? id : null;
}

/**
 * Stores a new avatar and points the user at it, in one transaction.
 *
 * Deleting the previous row here means "replace" leaves exactly one avatar
 * per user. The old URL 404s immediately, which is correct: the photo it
 * identified no longer exists. Browsers that already cached it keep showing
 * the old image until the next profile fetch, exactly as an immutable asset
 * should behave.
 */
export async function saveAvatar(params: {
  userId: string;
  fileBuffer: Buffer;
}): Promise<{ avatarUrl: string; contentType: string; sizeBytes: number }> {
  const { userId, fileBuffer } = params;

  if (!fileBuffer.length) {
    throw new AvatarValidationError("The uploaded file is empty.");
  }
  if (fileBuffer.length > MAX_AVATAR_BYTES) {
    throw new AvatarValidationError("Avatar images must be smaller than 2 MB.");
  }

  const contentType = detectImageContentType(fileBuffer);
  if (!contentType) {
    throw new AvatarValidationError(
      "Avatars must be a JPEG, PNG or WebP image.",
    );
  }

  const avatar = await prisma.$transaction(async (tx) => {
    const created = await tx.userAvatar.create({
      data: {
        userId,
        contentType,
        data: fileBuffer,
        sizeBytes: fileBuffer.length,
      },
      select: { id: true },
    });

    const avatarUrl = `${AVATAR_URL_PREFIX}${created.id}`;
    await tx.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    // The new row is the only one this user should own. Any other row is a
    // previous upload (or a concurrent one that lost the race).
    await tx.userAvatar.deleteMany({
      where: { userId, id: { not: created.id } },
    });

    return { id: created.id, avatarUrl };
  });

  return {
    avatarUrl: avatar.avatarUrl,
    contentType,
    sizeBytes: fileBuffer.length,
  };
}

/** Reads the bytes a public avatar URL refers to. */
export async function getAvatar(avatarId: string) {
  if (!AVATAR_ID_RE.test(avatarId)) return null;
  return prisma.userAvatar.findUnique({
    where: { id: avatarId },
    select: { id: true, userId: true, contentType: true, data: true },
  });
}

/**
 * Rejects an `avatarUrl` that points at another member's uploaded photo.
 *
 * The URL is public, so without this check any authenticated user could copy
 * somebody else's avatar id into their own profile and present it as theirs.
 * Externally hosted URLs (Google/Telegram pictures written by the auth
 * services) are left alone: they are provider-issued, not ours to own.
 */
export async function assertOwnedAvatarUrl(
  userId: string,
  avatarUrl: string | null | undefined,
): Promise<void> {
  const avatarId = avatarIdFromUrl(avatarUrl);
  if (!avatarId) return;

  const owned = await prisma.userAvatar.findFirst({
    where: { id: avatarId, userId },
    select: { id: true },
  });
  if (!owned) {
    throw new AvatarValidationError("That avatar does not belong to this account.");
  }
}

/**
 * Deletes the stored photo behind `avatarUrl` when it is one of ours.
 * Best-effort: a failed cleanup must not fail the profile update that made the
 * photo irrelevant.
 */
export async function deleteAvatarForUrl(
  userId: string,
  avatarUrl: string | null | undefined,
): Promise<void> {
  const avatarId = avatarIdFromUrl(avatarUrl);
  if (!avatarId) return;
  try {
    await prisma.userAvatar.deleteMany({ where: { id: avatarId, userId } });
  } catch (err) {
    logger.warn({ err, userId }, "Could not delete the previous avatar");
  }
}

/** PDPP erasure: remove every stored photo for a user. */
export async function deleteAllAvatarsForUser(userId: string): Promise<number> {
  const deleted = await prisma.userAvatar.deleteMany({ where: { userId } });
  return deleted.count;
}
