import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getCount: ServiceFn<[], number> = async (context) => {
	const ProcessedImagesRepo = Repository.get(
		"processed-images",
		context.db,
		context.config.db,
	);

	const processedImageCount = await ProcessedImagesRepo.count({
		where: [],
	});
	return {
		error: undefined,
		data: Formatter.parseCount(processedImageCount?.count),
	};
};

export default getCount;
