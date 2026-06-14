import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import { resolveMediaTenant } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices, optionServices } from "../index.js";

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
		context.request.tenantKey !== undefined &&
		context.request.tenantKey !== null
			? await ProcessedImages.selectMultipleByMediaTenant({
					tenantKey: context.request.tenantKey,
				})
			: await ProcessedImages.selectMultiple({
					select: ["key", "file_size"],
					validation: {
						enabled: true,
					},
				});
	if (processedImagesRes.error) return processedImagesRes;

	if (processedImagesRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const totalSize = processedImagesRes.data.reduce(
		(acc, i) => acc + i.file_size,
		0,
	);
	const [_, clearProcessedRes, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.deleteMultiple({
			keys: processedImagesRes.data.map((i) => i.key),
			context: {
				tenant,
			},
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
		optionServices.adjustInt(context, {
			name: "media_storage_used",
			delta: -totalSize,
			min: 0,
		}),
	]);
	if (clearProcessedRes.error) return clearProcessedRes;
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearAll;
