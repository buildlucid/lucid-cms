import { randomUUID } from "node:crypto";
import type { BooleanInt } from "../../../libs/db/types.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import type {
	MediaCropInput,
	MediaOrigin,
	MediaType,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import clearProcessedImage from "../../processed-images/clear-single.js";
import checkHasMediaStorage from "../checks/check-has-media-storage.js";
import syncMedia, { type SyncedMedia } from "../strategies/sync-media.js";
import updateMedia from "../strategies/update.js";
import claimAwaitingSync from "./claim-awaiting-sync.js";
import deleteFilesAfterCommit from "./delete-files-after-commit.js";

type CropParent = {
	id: number;
	key: string;
	type: MediaType;
	origin: MediaOrigin;
	public: BooleanInt;
	owner_user_id: number | null;
	is_system: BooleanInt;
	relation_type?: "crop" | "poster" | null;
};

/**
 * Creates, restores or replaces a source's crop. A replaced crop gets the new file's key, and the
 * old file goes once the change is saved.
 */
const upsertCrop: ServiceFn<
	[
		{
			parent: CropParent;
			crop: MediaCropInput;
			userId: number | null;
		},
	],
	{ id: number; key: string }
> = async (context, data) => {
	if (data.parent.type !== "image" || data.parent.relation_type === "crop") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.errors.image.only"),
			},
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db);

	const [claimRes, existingCropRes] = await Promise.all([
		claimAwaitingSync(context, { key: data.crop.key }),
		Media.selectSingle({
			select: ["id", "key", "file_size"],
			where: [
				{ key: "parent_media_id", operator: "=", value: data.parent.id },
				{ key: "relation_type", operator: "=", value: "crop" },
			],
		}),
	]);
	if (claimRes.error) return claimRes;

	if (existingCropRes.error) return existingCropRes;

	let file: SyncedMedia & { type: "image" };

	if (existingCropRes.data) {
		const clearProcessedRes = await clearProcessedImage(context, {
			key: existingCropRes.data.key,
		});
		if (clearProcessedRes.error) return clearProcessedRes;

		const updateRes = await updateMedia(context, {
			key: data.crop.key,
			fileName: data.crop.fileName,
			public: formatter.formatBoolean(data.parent.public),
			replaces: { size: existingCropRes.data.file_size, type: "image" },
			allowedType: "image",
		});
		if (updateRes.error) return updateRes;

		file = { ...updateRes.data, type: "image" };
	} else {
		const syncRes = await syncMedia(context, {
			key: data.crop.key,
			fileName: data.crop.fileName,
			allowedType: "image",
		});
		if (syncRes.error) return syncRes;

		file = { ...syncRes.data, type: "image" };
	}

	const now = new Date().toISOString();
	const cropData = {
		key: file.key,
		e_tag: file.etag,
		status: file.status,
		storage_adapter_key: file.storageAdapterKey,
		storage_adapter_reference: file.storageAdapterReference,
		storage_adapter_data: file.storageAdapterData,
		origin: data.parent.origin,
		public: data.parent.public,
		type: file.type,
		mime_type: file.mimeType,
		file_extension: file.extension,
		file_name: data.crop.fileName,
		file_size: file.size,
		width: data.crop.width,
		height: data.crop.height,
		focal_x: data.crop.focalPoint
			? Math.round(data.crop.focalPoint.x * 10000)
			: null,
		focal_y: data.crop.focalPoint
			? Math.round(data.crop.focalPoint.y * 10000)
			: null,
		crop_x: data.crop.state.x,
		crop_y: data.crop.state.y,
		crop_width: data.crop.state.width,
		crop_height: data.crop.state.height,
		crop_rotation: data.crop.state.rotation,
		crop_skew_x: data.crop.state.skewX,
		crop_skew_y: data.crop.state.skewY,
		blur_hash: data.crop.blurHash ?? null,
		average_color: data.crop.averageColor ?? null,
		base64: data.crop.base64 ?? null,
		is_dark: data.crop.isDark ?? null,
		is_light: data.crop.isLight ?? null,
		owner_user_id: data.parent.owner_user_id,
		is_system: data.parent.is_system,
		is_deleted: false,
		is_deleted_at: null,
		deleted_by: null,
		folder_id: null,
		parent_media_id: data.parent.id,
		relation_type: "crop" as const,
		updated_at: now,
		updated_by: data.userId,
	};

	const cropRes = existingCropRes.data
		? await Media.updateSingle({
				where: [{ key: "id", operator: "=", value: existingCropRes.data.id }],
				data: cropData,
				returning: ["id", "key"],
				validation: { enabled: true },
			})
		: await Media.createSingle({
				data: {
					...cropData,
					uid: randomUUID(),
					is_deleted_at: undefined,
					deleted_by: undefined,
					created_at: now,
					created_by: data.userId,
				},
				returning: ["id", "key"],
				validation: { enabled: true },
			});
	if (cropRes.error) {
		//* the transaction rolls back failed database writes, but a newly stored file has to be deleted
		if (!existingCropRes.data) {
			const storage = await checkHasMediaStorage(context);
			if (storage.data) {
				await storage.data.delete(context, { key: file.key });
			}
		}
		return cropRes;
	}

	if (existingCropRes.data) {
		await deleteFilesAfterCommit(context, [existingCropRes.data.key]);
	}

	return { error: undefined, data: cropRes.data };
};

export default upsertCrop;
