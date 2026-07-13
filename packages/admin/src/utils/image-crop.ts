import type { Media, MediaCropState } from "@types";

const SUPPORTED_CROP_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

const MIME_EXTENSION: Record<
	(typeof SUPPORTED_CROP_MIME_TYPES)[number],
	string
> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

const normalizeCropMimeType = (mimeType?: string | null) => {
	if (!mimeType) return null;
	const normalized = mimeType.toLowerCase().split(";")[0]?.trim();
	if (
		SUPPORTED_CROP_MIME_TYPES.includes(
			normalized as (typeof SUPPORTED_CROP_MIME_TYPES)[number],
		)
	) {
		return normalized as (typeof SUPPORTED_CROP_MIME_TYPES)[number];
	}
	return null;
};

export type ImageCropProvenance = {
	origin: Media["origin"];
	aiGenerationRequestId?: string;
};

export type ImageCropSource = {
	file?: File | null;
	url?: string | null;
	name: string;
	mimeType?: string | null;
	provenance?: ImageCropProvenance;
	crop?: MediaCropState;
};

export const isSupportedCropMimeType = (
	mimeType?: string | null,
): mimeType is (typeof SUPPORTED_CROP_MIME_TYPES)[number] => {
	return normalizeCropMimeType(mimeType) !== null;
};

export const getCropMimeType = (mimeType?: string | null) => {
	return normalizeCropMimeType(mimeType) ?? "image/png";
};

const getFileBaseName = (fileName: string) => {
	const normalized = fileName.split(/[\\/]/).pop()?.trim() || "image";
	const extensionIndex = normalized.lastIndexOf(".");
	if (extensionIndex <= 0) return normalized;
	return normalized.slice(0, extensionIndex);
};

export const fileNameForMimeType = (fileName: string, mimeType: string) => {
	const safeMimeType = getCropMimeType(mimeType);
	return `${getFileBaseName(fileName)}.${MIME_EXTENSION[safeMimeType]}`;
};

const canvasHasTransparency = (canvas: HTMLCanvasElement) => {
	const context = canvas.getContext("2d");
	if (!context || canvas.width <= 0 || canvas.height <= 0) return false;

	const chunkHeight = 64;
	for (let y = 0; y < canvas.height; y += chunkHeight) {
		const height = Math.min(chunkHeight, canvas.height - y);
		const { data } = context.getImageData(0, y, canvas.width, height);
		for (let index = 3; index < data.length; index += 4) {
			if (data[index] < 255) return true;
		}
	}

	return false;
};

const getExportMimeType = (
	canvas: HTMLCanvasElement,
	mimeType?: string | null,
) => {
	const targetMimeType = getCropMimeType(mimeType);
	if (targetMimeType === "image/jpeg" && canvasHasTransparency(canvas)) {
		return "image/png";
	}

	return targetMimeType;
};

export const canvasToFile = async (props: {
	canvas: HTMLCanvasElement;
	fileName: string;
	mimeType?: string | null;
	quality?: number;
}) => {
	const targetMimeType = getExportMimeType(props.canvas, props.mimeType);
	const blob = await new Promise<Blob | null>((resolve) => {
		props.canvas.toBlob(resolve, targetMimeType, props.quality);
	});

	if (!blob) {
		throw new Error("Could not export image crop.");
	}

	const outputMimeType = getCropMimeType(blob.type || targetMimeType);
	return new File([blob], fileNameForMimeType(props.fileName, outputMimeType), {
		type: outputMimeType,
	});
};
