import type { BooleanInt } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	MediaAwaitingSyncRepository,
	MediaRepository,
} from "../../../libs/repositories/index.js";
import type { MediaCropInput, MediaOrigin } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import clearProcessedImage from "../../processed-images/clear-single.js";
import checkAwaitingSync from "../checks/check-awaiting-sync.js";
import deleteMediaObject from "../strategies/delete.js";
import syncMedia from "../strategies/sync-media.js";
import updateMedia from "../strategies/update.js";

type CropParent = {
	id: number;
	key: string;
	type: string;
	origin: MediaOrigin;
	public: BooleanInt;
	relation_type?: "crop" | "poster" | null;
};

/** Creates, restores, or overwrites the stable crop derivative for a source. */
const upsertCrop: ServiceFn<
	[
		{
			parent: CropParent;
			crop: MediaCropInput;
			userId: number;
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
	const MediaAwaitingSync = new MediaAwaitingSyncRepository(context.db);

	const [awaitingSyncRes, existingCropRes] = await Promise.all([
		checkAwaitingSync(context, { key: data.crop.key }),
		Media.selectSingle({
			select: ["id", "key", "e_tag", "file_size", "type"],
			where: [
				{ key: "parent_media_id", operator: "=", value: data.parent.id },
				{ key: "relation_type", operator: "=", value: "crop" },
			],
		}),
	]);
	if (awaitingSyncRes.error) return awaitingSyncRes;
	if (existingCropRes.error) return existingCropRes;

	let file: {
		key: string;
		etag: string | null;
		type: "image";
		mimeType: string;
		extension: string;
		size: number;
	};

	if (existingCropRes.data) {
		const clearProcessedRes = await clearProcessedImage(context, {
			key: existingCropRes.data.key,
		});
		if (clearProcessedRes.error) return clearProcessedRes;

		const updateRes = await updateMedia(context, {
			previousSize: existingCropRes.data.file_size,
			previousKey: existingCropRes.data.key,
			previousType: "image",
			previousEtag: existingCropRes.data.e_tag,
			updatedKey: data.crop.key,
			targetKey: existingCropRes.data.key,
			allowedType: "image",
			fileName: data.crop.fileName,
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
		file = {
			key: syncRes.data.key,
			etag: syncRes.data.etag,
			type: "image",
			mimeType: syncRes.data.mimeType,
			extension: syncRes.data.extension,
			size: syncRes.data.size,
		};
	}

	const now = new Date().toISOString();
	const cropData = {
		key: file.key,
		e_tag: file.etag,
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
		is_hidden: true,
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
					is_deleted_at: undefined,
					deleted_by: undefined,
					created_at: now,
					created_by: data.userId,
				},
				returning: ["id", "key"],
				validation: { enabled: true },
			});
	if (cropRes.error) {
		if (!existingCropRes.data) {
			await deleteMediaObject(context, {
				key: file.key,
				size: file.size,
				processedSize: 0,
			});
		}
		return cropRes;
	}

	const deleteAwaitingRes = await MediaAwaitingSync.deleteSingle({
		where: [{ key: "key", operator: "=", value: data.crop.key }],
		returning: ["key"],
	});
	if (deleteAwaitingRes.error) return deleteAwaitingRes;

	return { error: undefined, data: cropRes.data };
};

export default upsertCrop;
