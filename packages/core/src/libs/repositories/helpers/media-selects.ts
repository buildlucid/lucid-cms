import { sql } from "kysely";
import type DatabaseAdapter from "../../db/adapter-base.js";
import type { KyselyDB } from "../../db/types.js";

/** Builds the correlated selection for a source's active crop derivative. */
export const activeMediaCropSelect = (
	db: KyselyDB,
	adapter: DatabaseAdapter,
	parentIdReference: string,
) =>
	adapter
		.jsonArrayFrom(
			db
				.selectFrom("lucid_media as active_media_crop")
				.select([
					"active_media_crop.id",
					"active_media_crop.key",
					"active_media_crop.origin",
					"active_media_crop.type",
					"active_media_crop.mime_type",
					"active_media_crop.file_extension",
					"active_media_crop.file_name",
					"active_media_crop.file_size",
					"active_media_crop.width",
					"active_media_crop.height",
					"active_media_crop.focal_x",
					"active_media_crop.focal_y",
					"active_media_crop.crop_x",
					"active_media_crop.crop_y",
					"active_media_crop.crop_width",
					"active_media_crop.crop_height",
					"active_media_crop.crop_rotation",
					"active_media_crop.crop_skew_x",
					"active_media_crop.crop_skew_y",
					"active_media_crop.blur_hash",
					"active_media_crop.average_color",
					"active_media_crop.base64",
					"active_media_crop.is_dark",
					"active_media_crop.is_light",
				])
				.where(
					"active_media_crop.parent_media_id",
					"=",
					sql.ref<number>(parentIdReference),
				)
				.where("active_media_crop.relation_type", "=", "crop")
				.where(
					"active_media_crop.is_deleted",
					"=",
					adapter.getDefault("boolean", "false"),
				),
		)
		.as("crop");
