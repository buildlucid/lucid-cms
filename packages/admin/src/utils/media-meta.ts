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

export interface VideoMeta {
	width: number;
	height: number;
	duration: number | null;
}

export interface AudioMeta {
	duration: number | null;
}

const mediaMetadataTimeout = 10000;

const readTimedMediaMeta = async <T>(props: {
	file: File;
	type: "audio" | "video";
	format: (element: HTMLMediaElement) => T | null;
}): Promise<T | null> => {
	if (!props.file.type.startsWith(`${props.type}/`)) return null;
	const url = URL.createObjectURL(props.file);
	const element = document.createElement(props.type);
	element.preload = "metadata";
	element.src = url;

	try {
		await new Promise<void>((resolve, reject) => {
			const timeout = window.setTimeout(() => {
				cleanup();
				reject(new Error(`Timed out reading ${props.type} metadata.`));
			}, mediaMetadataTimeout);
			const cleanup = () => {
				window.clearTimeout(timeout);
				element.removeEventListener("loadedmetadata", onLoaded);
				element.removeEventListener("error", onError);
			};
			const onLoaded = () => {
				cleanup();
				resolve();
			};
			const onError = () => {
				cleanup();
				reject(new Error(`Unable to read ${props.type} metadata.`));
			};

			element.addEventListener("loadedmetadata", onLoaded, { once: true });
			element.addEventListener("error", onError, { once: true });
			element.load();
		});

		return props.format(element);
	} catch (error) {
		console.warn(`Error extracting ${props.type} metadata:`, error);
		return null;
	} finally {
		element.removeAttribute("src");
		element.load();
		URL.revokeObjectURL(url);
	}
};

const formatDuration = (media: HTMLMediaElement) =>
	Number.isFinite(media.duration) && media.duration >= 0
		? media.duration
		: null;

/** Reads portable video metadata without loading the whole file into memory. */
export const getVideoMeta = async (file: File): Promise<VideoMeta | null> =>
	readTimedMediaMeta({
		file,
		type: "video",
		format: (element) => {
			const video = element as HTMLVideoElement;
			if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

			return {
				width: video.videoWidth,
				height: video.videoHeight,
				duration: formatDuration(video),
			};
		},
	});

/** Reads portable audio duration without loading the whole file into memory. */
export const getAudioMeta = async (file: File): Promise<AudioMeta | null> =>
	readTimedMediaMeta({
		file,
		type: "audio",
		format: (audio) => ({ duration: formatDuration(audio) }),
	});

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
		if (blob?.type !== "image/webp") return null;

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
