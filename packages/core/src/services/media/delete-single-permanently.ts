import executeHooks from "../../libs/hooks/execute-hooks.js";
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

	const hookRes = await executeHooks(
		context,
		{
			service: "media",
			event: "afterDelete",
			config: context.config,
		},
		{
			meta: {
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				ids: [data.id],
				userId: data.userId,
				hardDelete: true,
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
