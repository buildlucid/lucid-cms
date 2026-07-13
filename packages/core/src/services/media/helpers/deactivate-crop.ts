import { MediaRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Soft-deletes a source's crop while retaining its object and stale URL. */
const deactivateCrop: ServiceFn<
	[{ parentId: number; userId: number }],
	undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const cropRes = await Media.updateSingle({
		where: [
			{ key: "parent_media_id", operator: "=", value: data.parentId },
			{ key: "relation_type", operator: "=", value: "crop" },
		],
		data: {
			is_deleted: true,
			is_deleted_at: new Date().toISOString(),
			deleted_by: data.userId,
			updated_at: new Date().toISOString(),
			updated_by: data.userId,
		},
		returning: ["id"],
	});
	if (cropRes.error) return cropRes;
	return { error: undefined, data: undefined };
};

export default deactivateCrop;
