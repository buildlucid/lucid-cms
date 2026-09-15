const posterFrameTime = 0.2;
const maxPosterFrameEdge = 1920;
const mediaEventTimeoutMs = 10000;
const haveMetadata = 1;
const haveCurrentData = 2;

type VideoFrameSource =
	| File
	| {
			url: string;
			fileName: string;
	  };

const waitForMediaEvent = (
	video: HTMLVideoElement,
	eventName: "loadedmetadata" | "loadeddata" | "seeked",
) =>
	new Promise<void>((resolve, reject) => {
		const timeout = window.setTimeout(() => {
			cleanup();
			reject(new Error(`Timed out waiting for video ${eventName}.`));
		}, mediaEventTimeoutMs);

		const cleanup = () => {
			window.clearTimeout(timeout);
			video.removeEventListener(eventName, onEvent);
			video.removeEventListener("error", onError);
		};
		const onEvent = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new Error("Unable to load the selected video."));
		};

		video.addEventListener(eventName, onEvent, { once: true });
		video.addEventListener("error", onError, { once: true });
	});

const canvasToBlob = (
	canvas: HTMLCanvasElement,
	type: "image/webp" | "image/png",
	quality?: number,
) =>
	new Promise<Blob | null>((resolve) => {
		canvas.toBlob(resolve, type, quality);
	});

const posterFileName = (videoFileName: string, mimeType: string) => {
	const extension = mimeType === "image/png" ? "png" : "webp";
	const baseName = videoFileName.replace(/\.[^.]+$/, "") || "video";
	return `${baseName}-poster.${extension}`;
};

const sourceToObjectUrl = async (source: VideoFrameSource) => {
	if (source instanceof File) {
		return {
			url: URL.createObjectURL(source),
			fileName: source.name,
		};
	}

	const response = await fetch(source.url, {
		credentials: "include",
	});
	if (!response.ok) throw new Error("Unable to fetch the selected video.");

	const blob = await response.blob();
	return {
		url: URL.createObjectURL(blob),
		fileName: source.fileName,
	};
};

const seekToPosterFrame = async (video: HTMLVideoElement) => {
	if (video.readyState < haveMetadata) {
		await waitForMediaEvent(video, "loadedmetadata");
	}

	const duration =
		Number.isFinite(video.duration) && video.duration > 0
			? video.duration
			: undefined;
	const seekTime =
		duration === undefined
			? posterFrameTime
			: Math.min(posterFrameTime, Math.max(duration - 0.01, 0));

	if (seekTime <= 0) {
		if (video.readyState < haveCurrentData) {
			await waitForMediaEvent(video, "loadeddata");
		}
		return;
	}

	try {
		video.currentTime = seekTime;
		await waitForMediaEvent(video, "seeked");
	} catch (error) {
		if (video.readyState < haveCurrentData) throw error;
	}
};

export const captureVideoPosterFrame = async (
	source: VideoFrameSource,
): Promise<File | null> => {
	if (source instanceof File && !source.type.startsWith("video/")) return null;

	const { url, fileName } = await sourceToObjectUrl(source);
	const video = document.createElement("video");

	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";
	video.src = url;
	video.load();

	try {
		await seekToPosterFrame(video);

		if (video.videoWidth <= 0 || video.videoHeight <= 0) {
			throw new Error("Unable to read video dimensions.");
		}

		const scale = Math.min(
			1,
			maxPosterFrameEdge / Math.max(video.videoWidth, video.videoHeight),
		);
		const width = Math.max(1, Math.round(video.videoWidth * scale));
		const height = Math.max(1, Math.round(video.videoHeight * scale));
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");

		if (!context) throw new Error("Unable to capture video frame.");

		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);

		const webp = await canvasToBlob(canvas, "image/webp", 0.9);
		const blob =
			webp?.type === "image/webp"
				? webp
				: await canvasToBlob(canvas, "image/png");

		if (!blob) throw new Error("Unable to create poster image.");

		const mimeType =
			blob.type === "image/webp" || blob.type === "image/png"
				? blob.type
				: "image/png";

		return new File([blob], posterFileName(fileName, mimeType), {
			type: mimeType,
			lastModified: Date.now(),
		});
	} finally {
		URL.revokeObjectURL(url);
		video.removeAttribute("src");
		video.load();
	}
};
