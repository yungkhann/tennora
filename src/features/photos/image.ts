import sharp from "sharp";
export const maxUploadBytes = 2 * 1024 * 1024;
export const maxPublishedBytes = 256 * 1024;
const formats = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
export async function imageMime(data: Uint8Array) {
  if (!data.byteLength || data.byteLength > maxUploadBytes)
    throw new Error("Invalid image size");
  const bytes = Buffer.from(data);
  const supported =
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP");
  if (!supported) throw new Error("Unsupported image");
  const metadata = await sharp(data, { limitInputPixels: 16000000 }).metadata();
  if (
    !metadata.format ||
    !(metadata.format in formats) ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Unsupported image");
  return formats[metadata.format as keyof typeof formats];
}
export async function evidenceMime(data: Uint8Array) {
  if (!data.byteLength || data.byteLength > maxUploadBytes)
    throw new Error("Invalid evidence size");
  if (Buffer.from(data.subarray(0, 5)).toString() === "%PDF-")
    return "application/pdf";
  return imageMime(data);
}
export async function publishableJpeg(data: Uint8Array) {
  await imageMime(data);
  const output = await sharp(data, { limitInputPixels: 16000000 })
    .autoOrient()
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 75 })
    .toBuffer();
  if (output.byteLength > maxPublishedBytes)
    throw new Error("Image too large to publish");
  return output;
}
