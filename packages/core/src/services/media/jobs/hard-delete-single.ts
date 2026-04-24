import type { ServiceFn } from "../../../utils/services/types.js";
import permanentlyDeleteMedia from "../helpers/permanently-delete-media.js";

const hardDeleteSingleMedia: ServiceFn<
	[
		{
			mediaId: number;
		},
	],
	undefined
> = async (context, data) => {
	const deleteRes = await permanentlyDeleteMedia(context, {
		id: data.mediaId,
		deletePoster: true,
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default hardDeleteSingleMedia;
