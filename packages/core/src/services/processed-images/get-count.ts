import { ProcessedImagesRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getCount: ServiceFn<[], number> = async (context) => {
	const ProcessedImages = new ProcessedImagesRepository(
		context.db,
		context.config.db,
	);

	const processedImageCountRes = await ProcessedImages.count({
		validation: { enabled: true },
	});
	if (processedImageCountRes.error) return processedImageCountRes;

	return {
		error: undefined,
		data: formatter.parseCount(processedImageCountRes.data?.count),
	};
};

export default getCount;
