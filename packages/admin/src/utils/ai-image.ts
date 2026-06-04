type ImageSource = {
	file?: File | null;
	url?: string | null;
	filename?: string;
};

interface PrepareAiImageOptions {
	maxEdge?: number;
	quality?: number;
	signal?: AbortSignal;
}

export type PreparedAiImage = {
	data: string;
	mimeType: "image/webp";
	filename?: string;
	width: number;
	height: number;
};

const blobToDataUrl = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

const loadImage = (blob: Blob) =>
	new Promise<HTMLImageElement>((resolve, reject) => {
		const objectUrl = URL.createObjectURL(blob);
		const image = new Image();
		image.decoding = "async";
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("Unable to read image."));
		};
		image.src = objectUrl;
	});

const canvasToWebp = (canvas: HTMLCanvasElement, quality: number) =>
	new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Unable to convert image to WebP."));
					return;
				}
				resolve(blob);
			},
			"image/webp",
			quality,
		);
	});

const getImageBlob = async (source: ImageSource, signal?: AbortSignal) => {
	if (source.file) return source.file;
	if (!source.url) throw new Error("No image selected.");

	const response = await fetch(source.url, {
		credentials: "include",
		signal,
	});
	if (!response.ok) throw new Error("Unable to fetch the selected image.");

	return response.blob();
};

export const prepareAiImage = async (
	source: ImageSource,
	options: PrepareAiImageOptions = {},
): Promise<PreparedAiImage> => {
	const maxEdge = options.maxEdge ?? 1024;
	const quality = options.quality ?? 0.82;
	const blob = await getImageBlob(source, options.signal);
	if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
	const image = await loadImage(blob);
	if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
	const sourceWidth = image.naturalWidth || image.width;
	const sourceHeight = image.naturalHeight || image.height;
	if (sourceWidth <= 0 || sourceHeight <= 0) {
		throw new Error("Unable to read image dimensions.");
	}

	const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
	const width = Math.max(1, Math.round(sourceWidth * scale));
	const height = Math.max(1, Math.round(sourceHeight * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext("2d");
	if (!context) throw new Error("Unable to prepare the selected image.");

	context.drawImage(image, 0, 0, width, height);
	if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");

	const webp = await canvasToWebp(canvas, quality);
	if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
	const dataUrl = await blobToDataUrl(webp);

	return {
		data: dataUrl.split(",")[1] ?? dataUrl,
		mimeType: "image/webp",
		filename: source.filename ?? source.file?.name,
		width,
		height,
	};
};
