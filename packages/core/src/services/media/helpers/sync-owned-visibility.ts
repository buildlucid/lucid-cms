import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import changeKeyVisibility from "../../../utils/media/change-key-visibility.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import clearProcessedImage from "../../processed-images/clear-single.js";
import notifyChange from "../notify-change.js";
import renameMedia from "../strategies/rename.js";

/** Synchronizes visibility, ownership and storage keys across all owned descendants. */
const syncOwnedVisibility: ServiceFn<
	[
		{
			parentId: number;
			public: boolean;
			ownerUserId: number | null;
			isSystem: boolean;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Media = new MediaRepository(context.db);
	const childrenRes = await Media.selectMultiple({
		select: ["id", "key", "public", "owner_user_id", "is_system"],
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
				const clearProcessedRes = await clearProcessedImage(context, {
					key: child.key,
				});
				if (clearProcessedRes.error) return clearProcessedRes;

				const renameRes = await renameMedia(context, {
					from: child.key,
					to: targetKey,
				});
				if (renameRes.error) return renameRes;
			}

			if (
				targetKey !== child.key ||
				formatter.formatBoolean(child.public) !== data.public ||
				child.owner_user_id !== data.ownerUserId ||
				formatter.formatBoolean(child.is_system) !== data.isSystem
			) {
				const updateRes = await Media.updateSingle({
					where: [{ key: "id", operator: "=", value: child.id }],
					data: {
						key: targetKey,
						public: data.public,
						owner_user_id: data.ownerUserId,
						is_system: data.isSystem,
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
				ownerUserId: data.ownerUserId,
				isSystem: data.isSystem,
			});
		}),
	);
	const failedChild = childResults.find((result) => result.error);
	if (failedChild) return failedChild;

	const changed = await notifyChange(context, {
		change: { type: "updated" },
		ids: childrenRes.data.map((child) => child.id),
	});
	if (changed.error) return changed;

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncOwnedVisibility;
