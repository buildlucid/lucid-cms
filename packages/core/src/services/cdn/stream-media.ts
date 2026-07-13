import mime from "mime-types";
import { copy } from "../../libs/i18n/index.js";
import type { MediaAdapterStreamBody } from "../../libs/media/types.js";
import type { StreamSingleQueryParams } from "../../schemas/cdn.js";
import {
	generateProcessKey,
	isProcessedImageKey,
	normalizeMediaKey,
	resolveMediaKeyTenant,
	resolveProcessingRequest,
} from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../index.js";

/**
 * Streams the canonical media key and applies presets or formats on demand.
 */
const streamMedia: ServiceFn<
	[
		{
			key: string;
			query: StreamSingleQueryParams;
			accept: string | undefined;
			ifNoneMatch?: string;
			range?: {
				start: number;
				end?: number;
			};
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaAdapterStreamBody;
		etag?: string | null;
		notModified?: boolean;
		isPartialContent?: boolean;
		totalSize?: number;
		range?: {
			start: number;
			end: number;
		};
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const normalizedKey = normalizeMediaKey(data.key);
	const isProcessedKey = isProcessedImageKey(normalizedKey);
	const tenant = resolveMediaKeyTenant(context.config, normalizedKey);

	if (isProcessedKey) {
		return {
			error: {
				type: "basic",
				status: 404,
				name: copy("server:core.media.not.found.name"),
				message: copy("server:core.media.not.found.message"),
			},
			data: undefined,
		};
	}

	const processingRequest = resolveProcessingRequest({
		presets: context.config.media.images.presets,
		allowFormatQuery: context.config.media.images.allowFormatQuery,
		query: data.query,
		accept: data.accept,
	});

	if (!processingRequest.hasProcessing) {
		const res = await mediaStrategyRes.data.stream(context, {
			key: normalizedKey,
			ifNoneMatch: data.ifNoneMatch,
			range: data.range,
			tenant,
		});
		if (res.error) return res;
		return {
			error: undefined,
			data: {
				key: normalizedKey,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
				etag: res.data.etag,
				notModified: res.data.notModified,
				isPartialContent: res.data.isPartialContent,
				totalSize: res.data.totalSize,
				range: res.data.range,
			},
		};
	}

	// ------------------------------
	// Processed Image
	let sourceExtension: string | null = processingRequest.format ?? null;
	if (!sourceExtension) {
		const metaRes = await mediaStrategyRes.data.getMeta(context, {
			key: normalizedKey,
			tenant,
		});
		if (metaRes.error) return metaRes;
		sourceExtension = mime.extension(metaRes.data.mimeType || "") || null;
	}

	const processKey = generateProcessKey({
		key: normalizedKey,
		extension: sourceExtension,
		options: {
			format: processingRequest.format,
			quality: processingRequest.quality,
			width: processingRequest.width,
			height: processingRequest.height,
			fit: processingRequest.fit,
		},
	});

	const res = await mediaStrategyRes.data.stream(context, {
		key: processKey,
		ifNoneMatch: data.ifNoneMatch,
		range: data.range,
		tenant: resolveMediaKeyTenant(context.config, processKey),
	});
	if (res.data) {
		return {
			error: undefined,
			data: {
				key: processKey,
				contentLength: res.data.contentLength,
				contentType: res.data.contentType,
				body: res.data.body,
				etag: res.data.etag,
				notModified: res.data.notModified,
				isPartialContent: res.data.isPartialContent,
				totalSize: res.data.totalSize,
				range: res.data.range,
			},
		};
	}

	// Process
	return await processedImageServices.processImage(context, {
		key: normalizedKey,
		processKey: processKey,
		ifNoneMatch: data.ifNoneMatch,
		options: {
			format: processingRequest.format,
			quality: processingRequest.quality,
			width: processingRequest.width,
			height: processingRequest.height,
			fit: processingRequest.fit,
		},
	});
};

export default streamMedia;
