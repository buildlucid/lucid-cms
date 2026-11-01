import { PassThrough } from "node:stream";
import constants from "../../constants/constants.js";
import type { MediaTransformationOptions } from "../../libs/media-delivery/types.js";
import {
	splitBodyForProcessing,
	toNodeReadable,
} from "../../libs/media-storage/normalize-body.js";
import type { MediaStorageAdapterStreamBody } from "../../libs/media-storage/types.js";
import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import { createWritePause } from "../../utils/helpers/index.js";
import { createBufferETag, matchesETag } from "../../utils/http/etag.js";
import type { ServiceFn } from "../../utils/services/types.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";
import checkHasMediaStorage from "../media/checks/check-has-media-storage.js";
import checkCanStore from "./checks/check-can-store.js";
import getSingleCount from "./get-single-count.js";
import optimizeImage from "./optimize-image.js";

const processedImageWrites = createWritePause({
	action: "store a processed image",
	scope: constants.logScopes.lucid,
});

/**
 * Resizes and optionally stores images. A matching source-based ETag skips downloading and
 * resizing.
 */
const processImage: ServiceFn<
	[
		{
			key: string;
			processKey: string;
			/** Source ETag, or null to hash the resized bytes. */
			sourceEtag: string | null;
			ifNoneMatch?: string;
			options: MediaTransformationOptions;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaStorageAdapterStreamBody;
		etag?: string | null;
		notModified?: boolean;
	}
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const Media = new MediaRepository(context.db);

	const focalRes = await Media.selectSingle({
		select: ["focal_x", "focal_y"],
		where: [{ key: "key", operator: "=", value: data.key }],
	});
	if (focalRes.error) return focalRes;

	const focalPoint =
		focalRes.data?.focal_x != null && focalRes.data.focal_y != null
			? {
					x: focalRes.data.focal_x / 10000,
					y: focalRes.data.focal_y / 10000,
				}
			: undefined;

	//* Weak, as resizing the same original isn't guaranteed to give identical bytes.
	const sourceBasedEtag = data.sourceEtag
		? `W/"${createBufferETag(
				Buffer.from(
					JSON.stringify([
						data.sourceEtag,
						data.processKey,
						focalPoint ?? null,
					]),
				),
			)}"`
		: null;

	if (
		sourceBasedEtag &&
		data.ifNoneMatch &&
		matchesETag(data.ifNoneMatch, sourceBasedEtag)
	) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: undefined,
				contentType: undefined,
				body: new Uint8Array(),
				etag: sourceBasedEtag,
				notModified: true,
			},
		};
	}

	const mediaRes = await mediaStorageRes.data.stream(context, {
		key: data.key,
	});
	if (mediaRes.error) return mediaRes;

	if (!mediaRes.data?.contentType?.startsWith("image/")) {
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: mediaRes.data.contentLength,
				contentType: mediaRes.data.contentType,
				body: mediaRes.data.body,
				etag: mediaRes.data.etag,
			},
		};
	}

	const { processingBody, fallbackBody } = splitBodyForProcessing(
		mediaRes.data.body,
	);

	const [imageRes, processedCountRes] = await Promise.all([
		optimizeImage(context, {
			stream: toNodeReadable(processingBody),
			options: { ...data.options, focalPoint },
		}),
		getSingleCount(context, {
			key: data.key,
		}),
	]);

	if (
		imageRes.error ||
		processedCountRes.error ||
		!imageRes.data ||
		!imageRes.data.processed
	) {
		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: mediaRes.data.contentLength,
				contentType: mediaRes.data.contentType,
				body: fallbackBody,
				etag: mediaRes.data.etag,
			},
		};
	}

	let processedEtag = sourceBasedEtag ?? createBufferETag(imageRes.data.buffer);

	//* Only reachable with a match when the original has no ETag.
	if (data.ifNoneMatch && matchesETag(data.ifNoneMatch, processedEtag)) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: undefined,
				contentType: imageRes.data.mimeType,
				body: new Uint8Array(),
				etag: processedEtag,
				notModified: true,
			},
		};
	}

	const stream = new PassThrough();
	stream.end(imageRes.data.buffer);

	if (!imageRes.data.shouldStore) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	if (
		processedCountRes.data >=
		context.config.media.images.cache.maxVariantsPerFile
	) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	const canStoreRes = await checkCanStore(context, {
		size: imageRes.data.size,
	});
	if (canStoreRes.error) {
		return {
			error: undefined,
			data: {
				key: data.processKey,
				contentLength: imageRes.data.size,
				contentType: imageRes.data.mimeType,
				body: stream,
				etag: processedEtag,
			},
		};
	}

	const ProcessedImages = new ProcessedImagesRepository(context.db);

	if (
		context.config.media.images.cache.enabled &&
		!processedImageWrites.isPaused()
	) {
		const storageLimit = context.config.media.limits.storageBytes;
		const adjustStorageRes = await adjustStorageUsage(context, {
			delta: imageRes.data.size,
			max: storageLimit === false ? undefined : storageLimit,
			min: 0,
		});
		if (adjustStorageRes.error || !adjustStorageRes.data.applied) {
			if (adjustStorageRes.error) processedImageWrites.pause();
			return {
				error: undefined,
				data: {
					key: data.processKey,
					contentLength: imageRes.data.size,
					contentType: imageRes.data.mimeType,
					body: stream,
					etag: processedEtag,
				},
			};
		}

		const [createProcessedImageRes, uploadRes] = await Promise.all([
			ProcessedImages.createSingle({
				data: {
					key: data.processKey,
					media_key: data.key,
					file_size: imageRes.data.size,
				},
			}),
			mediaStorageRes.data.upload(context, {
				key: data.processKey,
				body: imageRes.data.buffer,
				mimeType: imageRes.data.mimeType,
				extension: imageRes.data.extension,
				size: imageRes.data.size,
				type: "image",
			}),
		]);

		if (
			createProcessedImageRes.error !== undefined ||
			uploadRes.error !== undefined
		) {
			processedImageWrites.pause();
			await adjustStorageUsage(context, {
				delta: imageRes.data.size * -1,
				min: 0,
			});

			await Promise.allSettled([
				createProcessedImageRes.error === undefined
					? ProcessedImages.deleteSingle({
							where: [{ key: "key", operator: "=", value: data.processKey }],
							returning: ["key"],
						})
					: Promise.resolve(),
				uploadRes.error === undefined
					? mediaStorageRes.data.delete(context, {
							key: data.processKey,
						})
					: Promise.resolve(),
			]);

			return {
				error: undefined,
				data: {
					key: data.processKey,
					contentLength: imageRes.data.size,
					contentType: imageRes.data.mimeType,
					body: stream,
					etag: processedEtag,
				},
			};
		}

		if (uploadRes.error === undefined && uploadRes.data?.etag) {
			processedEtag = uploadRes.data.etag;
		}
	}

	return {
		error: undefined,
		data: {
			key: data.processKey,
			contentLength: imageRes.data.size,
			contentType: imageRes.data.mimeType,
			body: stream,
			etag: processedEtag,
		},
	};
};

export default processImage;
