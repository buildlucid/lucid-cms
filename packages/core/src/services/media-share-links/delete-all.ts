import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteAll: ServiceFn<[], undefined> = async (context) => {
	const MediaShareLinks = new MediaShareLinksRepository(
		context.db,
		context.config.db,
	);

	const deleteRes = await MediaShareLinks.deleteMultiple({
		where: [],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteAll;
