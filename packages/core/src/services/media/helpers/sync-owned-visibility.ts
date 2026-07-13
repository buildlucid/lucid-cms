import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import changeKeyVisibility from "../../../utils/media/change-key-visibility.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { mediaServices, processedImageServices } from "../../index.js";

/** Synchronizes visibility and storage keys across all owned descendants. */
const syncOwnedVisibility: ServiceFn<
	[{ parentId: number; public: boolean; userId: number }],
	undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db.client, context.config.db);
	const childrenRes = await Media.selectMultiple({
		select: ["id", "key", "public"],
		where: [{ key: "parent_media_id", operator: "=", value: data.parentId }],
		validation: { enabled: true },
	});
	if (childrenRes.error) return childrenRes;

	const childResults = await Promise.all(
		childrenRes.data.map(async (child) => {
			const targetKey = changeKeyVisibility({
				key: child.key,
				visibility: data.public
					? constants.media.visibilityKeys.public
					: constants.media.visibilityKeys.private,
			});

			if (targetKey !== child.key) {
				const clearProcessedRes = await processedImageServices.clearSingle(
					context,
					{
						key: child.key,
					},
				);
				if (clearProcessedRes.error) return clearProcessedRes;

				const renameRes = await mediaServices.strategies.rename(context, {
					from: child.key,
					to: targetKey,
				});
				if (renameRes.error) return renameRes;
			}

			if (
				targetKey !== child.key ||
				formatter.formatBoolean(child.public) !== data.public
			) {
				const updateRes = await Media.updateSingle({
					where: [{ key: "id", operator: "=", value: child.id }],
					data: {
						key: targetKey,
						public: data.public,
						updated_at: new Date().toISOString(),
						updated_by: data.userId,
					},
					returning: ["id"],
				});
				if (updateRes.error) return updateRes;
			}

			return syncOwnedVisibility(context, {
				parentId: child.id,
				public: data.public,
				userId: data.userId,
			});
		}),
	);
	const failedChild = childResults.find((result) => result.error);
	if (failedChild) return failedChild;

	return { error: undefined, data: undefined };
};

export default syncOwnedVisibility;
