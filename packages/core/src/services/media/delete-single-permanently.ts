import type { ServiceFn } from "../../utils/services/types.js";
import permanentlyDeleteMedia from "./helpers/permanently-delete-media.js";

const deleteSinglePermanently: ServiceFn<
	[
		{
			id: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const deleteRes = await permanentlyDeleteMedia(context, {
		id: data.id,
		deletePoster: true,
	});
	if (deleteRes.error) return deleteRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
