import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import { resolveMediaTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import adjustStorageUsage from "../media/adjust-storage-usage.js";

// TODO: push this to a queue
const clearAll: ServiceFn<[], undefined> = async (context) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const ProcessedImages = new ProcessedImagesRepository(
		context.db.client,
		context.config.db,
	);
	const tenant = resolveMediaTenant(
		context.config,
		context.request.tenantKey ?? null,
	);

	const processedImagesRes =
		await ProcessedImages.selectMultipleWithMediaTenant({
			tenantKey: context.request.tenantKey,
		});
	if (processedImagesRes.error) return processedImagesRes;

	if (processedImagesRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const sizeByTenant = new Map<string | null, number>();
	for (const image of processedImagesRes.data) {
		sizeByTenant.set(
			image.tenant_key,
			(sizeByTenant.get(image.tenant_key) ?? 0) + image.file_size,
		);
	}

	const [_, clearProcessedRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple({
			context,
			keys: processedImagesRes.data.map((i) => i.key),
			tenant,
		}),
		ProcessedImages.deleteMultiple({
			where:
				context.request.tenantKey !== undefined &&
				context.request.tenantKey !== null
					? [
							{
								key: "key",
								operator: "in",
								value: processedImagesRes.data.map((i) => i.key),
							},
						]
					: [],
		}),
	]);
	if (clearProcessedRes.error) return clearProcessedRes;

	for (const [tenantKey, totalSize] of sizeByTenant.entries()) {
		const updateStorageRes = await adjustStorageUsage(context, {
			tenantKey,
			delta: -totalSize,
			min: 0,
		});
		if (updateStorageRes.error) return updateStorageRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearAll;
