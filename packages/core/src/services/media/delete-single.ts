import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

// TODO: when queues are implemented, refer back to how media should be deleted at the delete-single-permanently service
const deleteSingle: ServiceFn<
	[
		{
			id: number;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const mediaStrategyRes =
		context.services.media.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const Media = Repository.get("media", context.db, context.config.db);
	const deleteMediaRes = await Media.updateSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		data: {
			is_deleted: true,
			is_deleted_at: new Date().toISOString(),
			deleted_by: data.userId,
		},
		validation: {
			enabled: false,
		},
	});
	if (deleteMediaRes.error) return deleteMediaRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
