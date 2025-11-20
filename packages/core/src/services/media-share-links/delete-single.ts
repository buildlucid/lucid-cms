import { MediaShareLinksRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			mediaId: number;
			linkId: number;
		},
	],
	undefined
> = async (context, data) => {
	const MediaShareLinks = new MediaShareLinksRepository(
		context.db,
		context.config.db,
	);

	const deleteRes = await MediaShareLinks.deleteSingle({
		where: [
			{ key: "id", operator: "=", value: data.linkId },
			{ key: "media_id", operator: "=", value: data.mediaId },
		],
		returning: ["id"],
		validation: { enabled: true },
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
