import { resolveMediaKeyTenant } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices, optionServices } from "../../index.js";

const deleteObject: ServiceFn<
	[
		{
			key: string;
			size: number;
			processedSize: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const tenant = resolveMediaKeyTenant(context.config, data.key);

	const [_, updateStorageRes] = await Promise.all([
		mediaStrategyRes.data.delete({
			key: data.key,
			context: {
				tenant,
			},
		}),
		optionServices.adjustInt(context, {
			name: "media_storage_used",
			delta: -(data.size + data.processedSize),
			min: 0,
		}),
	]);
	if (updateStorageRes.error) return updateStorageRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteObject;
