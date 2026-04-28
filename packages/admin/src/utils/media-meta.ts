import { encode } from "blurhash";
import { FastAverageColor } from "fast-average-color";

export interface ImageMeta {
	width: number;
	height: number;
	blurHash: string;
	averageColor: string;
	base64: string | null;
	isDark: boolean;
	isLight: boolean;
}

const generateBase64Placeholder = async (
	file: File,
): Promise<string | null> => {
	try {
		if (!("createImageBitmap" in window)) return null;

		const image = await createImageBitmap(file);
		const maxSide = 10;
		const scale = maxSide / Math.max(image.width, image.height);
		const width = Math.max(1, Math.round(image.width * scale));
		const height = Math.max(1, Math.round(image.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			image.close();
			return null;
		}

		ctx.drawImage(image, 0, 0, width, height);
		image.close();

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, "image/webp", 0.5);
		});
		if (!blob || blob.type !== "image/webp") return null;

		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(blob);
		});
	} catch (error) {
		console.warn("Error generating base64 image placeholder:", error);
		return null;
	}
};

export const getImageMeta = async (file: File): Promise<ImageMeta | null> => {
	if (!file.type.startsWith("image/")) return null;

	try {
		const img = new Image();
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			console.warn(
				"Could not get canvas context for image metadata extraction",
			);
			return null;
		}

		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = URL.createObjectURL(file);
		});

		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);

		const blurHashSize = 64;
		const blurCanvas = document.createElement("canvas");
		const blurCtx = blurCanvas.getContext("2d");

		if (!blurCtx) throw new Error("Could not get blur canvas context");

		blurCanvas.width = blurHashSize;
		blurCanvas.height = Math.round((img.height / img.width) * blurHashSize);

		blurCtx.drawImage(img, 0, 0, blurCanvas.width, blurCanvas.height);
		const blurImageData = blurCtx.getImageData(
			0,
			0,
			blurCanvas.width,
			blurCanvas.height,
		);

		const blurHash = encode(
			blurImageData.data,
			blurCanvas.width,
			blurCanvas.height,
			4,
			4,
		);

		const fastAverageColor = new FastAverageColor();
		const colorResult = await fastAverageColor.getColorAsync(canvas);
		const base64 = await generateBase64Placeholder(file);

		URL.revokeObjectURL(img.src);

		return {
			width: img.width,
			height: img.height,
			blurHash,
			averageColor: colorResult.rgba,
			base64,
			isDark: colorResult.isDark,
			isLight: colorResult.isLight,
		};
	} catch (error) {
		console.error("Error extracting image metadata:", error);
		return null;
	}
};
