/**
 * A team's logo, shrunk in the browser to 256px on its longest side so it's small enough to keep in the database:
 * WebP where the browser can write it, else PNG. Throws when the file isn't an image it can read.
 */
export async function shrinkLogo(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

/** A team's initials, for when it has no logo: "Team Dan" is "TD", "The Dim Maks" is "DM". */
export const teamInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w && !/^the$/i.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
