import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  imageMime,
  evidenceMime,
  publishableJpeg,
  maxUploadBytes,
} from "@/features/photos/image";
describe("private-photo publication boundary", () => {
  it("normalizes image orientation and strips metadata from a bounded JPEG", async () => {
    const input = await sharp({
      create: { width: 1000, height: 600, channels: 3, background: "green" },
    })
      .jpeg()
      .withExif({ IFD0: { Artist: "Private guardian metadata" } })
      .toBuffer();
    expect(await imageMime(input)).toBe("image/jpeg");
    const output = await publishableJpeg(input),
      meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(307);
    expect(meta.exif).toBeUndefined();
    expect(output.length).toBeLessThan(256 * 1024);
  });
  it("accepts PDF only as evidence, never as a published portrait", async () => {
    const pdf = Buffer.from("%PDF-1.4\nsynthetic evidence");
    expect(await evidenceMime(pdf)).toBe("application/pdf");
    await expect(publishableJpeg(pdf)).rejects.toThrow();
  });
  it("rejects active vector content, empty and excessive uploads", async () => {
    await expect(
      imageMime(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
        ),
      ),
    ).rejects.toThrow();
    await expect(imageMime(new Uint8Array())).rejects.toThrow();
    await expect(
      imageMime(new Uint8Array(maxUploadBytes + 1)),
    ).rejects.toThrow();
  });
});
