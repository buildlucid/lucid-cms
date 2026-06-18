import {
	MediaRepository,
	ProcessedImagesRepository,
} from "../../libs/repositories/index.js";
import { multiTenancyEnabled } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

type StorageUsageBucket = {
	tenantKey: string | null;
	media: number;
	processedImages: number;
	total: number;
};

const getStorageUsage: ServiceFn<
	[
		{
			tenantKey?: string | null;
			includeAllBuckets?: boolean;
			grouped?: boolean;
		}?,
	],
	{
		media: number;
		processedImages: number;
		total: number;
		buckets?: StorageUsageBucket[];
	}
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);

	if (data?.grouped === true) {
		const [mediaSizeRes, processedImagesSizeRes] = await Promise.all([
			Media.sumFileSizeGroupedByTenant(),
			ProcessedImages.sumFileSizeGroupedByMediaTenant(),
		]);
		if (mediaSizeRes.error) return mediaSizeRes;
		if (processedImagesSizeRes.error) return processedImagesSizeRes;

		const bucketMap = new Map<string | null, StorageUsageBucket>();
		const getBucket = (tenantKey: string | null) => {
			const existing = bucketMap.get(tenantKey);
			if (existing) return existing;

			const bucket = {
				tenantKey,
				media: 0,
				processedImages: 0,
				total: 0,
			};
			bucketMap.set(tenantKey, bucket);
			return bucket;
		};

		getBucket(null);
		for (const row of mediaSizeRes.data) {
			const bucket = getBucket(row.tenant_key);
			bucket.media = row.total;
			bucket.total = bucket.media + bucket.processedImages;
		}
		for (const row of processedImagesSizeRes.data) {
			const bucket = getBucket(row.tenant_key);
			bucket.processedImages = row.total;
			bucket.total = bucket.media + bucket.processedImages;
		}

		const buckets = Array.from(bucketMap.values());
		const media = buckets.reduce((acc, bucket) => acc + bucket.media, 0);
		const processedImages = buckets.reduce(
			(acc, bucket) => acc + bucket.processedImages,
			0,
		);

		return {
			error: undefined,
			data: {
				media,
				processedImages,
				total: media + processedImages,
				buckets,
			},
		};
	}

	if (data?.includeAllBuckets !== true && multiTenancyEnabled(context.config)) {
		const tenantKey =
			data !== undefined && "tenantKey" in data
				? (data.tenantKey ?? null)
				: (context.request.tenantKey ?? null);

		const [mediaSizeRes, processedImagesSizeRes] = await Promise.all([
			Media.sumFileSizeByTenant({ tenantKey }),
			ProcessedImages.sumFileSizeByMediaTenant({ tenantKey }),
		]);
		if (mediaSizeRes.error) return mediaSizeRes;
		if (processedImagesSizeRes.error) return processedImagesSizeRes;

		const media = mediaSizeRes.data;
		const processedImages = processedImagesSizeRes.data;

		return {
			error: undefined,
			data: {
				media,
				processedImages,
				total: media + processedImages,
			},
		};
	}

	const [mediaSizeRes, processedImagesSizeRes] = await Promise.all([
		Media.sumFileSize(),
		ProcessedImages.sumFileSize(),
	]);
	if (mediaSizeRes.error) return mediaSizeRes;
	if (processedImagesSizeRes.error) return processedImagesSizeRes;

	const media = mediaSizeRes.data;
	const processedImages = processedImagesSizeRes.data;

	return {
		error: undefined,
		data: {
			media,
			processedImages,
			total: media + processedImages,
		},
	};
};

export default getStorageUsage;
