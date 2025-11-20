import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingleCount: ServiceFn<
	[
		{
			key: string;
		},
	],
	number
> = async (context, data) => {
	const ProcessedImages = new ProcessedImagesRepository(
		context.db,
		context.config.db,
	);

	const processedImageCountRes = await ProcessedImages.count({
		where: [
			{
				key: "media_key",
				operator: "=",
				value: data.key,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (processedImageCountRes.error) return processedImageCountRes;

	return {
		error: undefined,
		data: formatter.parseCount(processedImageCountRes.data?.count),
	};
};

export default getSingleCount;
