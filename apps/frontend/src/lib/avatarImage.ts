/**
 * Turns a user-selected photo into the small square JPEG the avatar endpoint
 * accepts.
 *
 * Why a Blob and not a data URL: `User.avatarUrl` is VARCHAR(500), and the
 * profile PATCH stores a *URL*. A 320px JPEG data URL is tens of kilobytes and
 * used to be sent as `avatarUrl`, which Postgres refused (`value too long for
 * type character varying(500)`) and the API surfaced as an opaque 500. The
 * compressed bytes now go to `POST /api/v1/users/me/avatar`, which stores them
 * and returns a short URL.
 */

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 1024 * 1024;

export function compressAvatarImage(file: File, maxDim = 320): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose a valid image file (JPG, PNG, WEBP, or GIF)."));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error("Image must be smaller than 10 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode that image."));
      img.onload = () => {
        try {
          const size = Math.min(img.width, img.height);
          if (!size) {
            reject(new Error("Could not read that image's dimensions."));
            return;
          }

          const canvas = document.createElement("canvas");
          const target = Math.min(maxDim, size);
          canvas.width = target;
          canvas.height = target;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not process that image."));
            return;
          }

          const sx = Math.max(0, Math.floor((img.width - size) / 2));
          const sy = Math.max(0, Math.floor((img.height - size) / 2));
          ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Could not process that image."));
                return;
              }
              if (blob.size > MAX_COMPRESSED_BYTES) {
                reject(new Error("That image is too detailed to compress. Try a smaller one."));
                return;
              }
              resolve(blob);
            },
            "image/jpeg",
            0.85,
          );
        } catch {
          reject(new Error("Could not process that image."));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
