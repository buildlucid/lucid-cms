import executeHooks from "../../libs/hooks/execute-hooks.js";
import type { MediaActor } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkMediaAccess from "./checks/check-media-access.js";
import permanentlyDeleteMedia from "./helpers/permanently-delete-media.js";
import notifyChange from "./notify-change.js";

const deleteSinglePermanently: ServiceFn<
	[
		{
			id: number;
			actor: MediaActor;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const accessRes = await checkMediaAccess(context, {
		id: data.id,
		actor: data.actor,
		action: "delete",
	});
	if (accessRes.error) return accessRes;

	const deleteRes = await permanentlyDeleteMedia(context, {
		id: data.id,
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
			meta: {},
			data: {
				ids: [data.id],
				userId: data.userId,
				hardDelete: true,
			},
		},
	);
	if (hookRes.error) return hookRes;

	const changed = await notifyChange(context, {
		change: { type: "deleted", permanent: true },
		ids: [data.id],
	});
	if (changed.error) return changed;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
