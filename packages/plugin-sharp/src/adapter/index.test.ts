import { Readable } from "node:stream";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import sharpMediaDeliveryAdapter from "./index.js";

describe("sharpMediaDeliveryAdapter", () => {
	it("auto-orients and applies explicit rotation before resizing", async () => {
		const input = await sharp({
			create: {
				width: 6,
				height: 4,
				channels: 3,
				background: "red",
			},
		})
			.png()
			.toBuffer();

		const processImage = sharpMediaDeliveryAdapter().processImage;
		if (!processImage) throw new Error("Expected image processing support");
		const result = await processImage({} as never, {
			stream: Readable.from(input),
			options: {
				rotate: 90,
				format: "png",
			},
		});

		expect(result.error).toBeUndefined();
		if (!result.data?.processed) throw new Error("Expected a processed image");

		const metadata = await sharp(result.data.buffer).metadata();
		expect(metadata.width).toBe(4);
		expect(metadata.height).toBe(6);
	});
});
