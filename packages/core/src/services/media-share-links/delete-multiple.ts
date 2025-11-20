import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultiple: ServiceFn<
	[
		{
			mediaId: number;
		},
	],
	undefined
> = async (context, data) => {
	const MediaShareLinks = new MediaShareLinksRepository(
		context.db,
		context.config.db,
	);

	const deleteRes = await MediaShareLinks.deleteMultiple({
		where: [{ key: "media_id", operator: "=", value: data.mediaId }],
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiple;
