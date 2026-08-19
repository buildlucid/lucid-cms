import { sql } from "kysely";
import type LucidDatabase from "../../db/client/lucid-database.js";

/** Builds the correlated selection for a source's active crop derivative. */
export const activeMediaCropSelect = (
	database: LucidDatabase,
	parentIdReference: string,
) => {
	return database.fn
		.jsonArrayFrom(
			database.kysely
				.selectFrom("lucid_media as active_media_crop")
				.select([
					"active_media_crop.id",
					"active_media_crop.key",
					"active_media_crop.status",
					"active_media_crop.storage_adapter_key",
					"active_media_crop.storage_adapter_reference",
					"active_media_crop.storage_adapter_data",
					"active_media_crop.public",
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
					database.adapter.getDefault("boolean", "false"),
				),
		)
		.as("crop");
};

/** Builds a compact image selection with its translations and active crop. */
export const mediaImageSelect = <Alias extends string>(
	database: LucidDatabase,
	mediaIdReference: string,
	alias: Alias,
) => {
	return database.fn
		.jsonArrayFrom(
			database.kysely
				.selectFrom("lucid_media as related_media_image")
				.select((eb) => [
					"related_media_image.id",
					"related_media_image.key",
					"related_media_image.status",
					"related_media_image.storage_adapter_key",
					"related_media_image.storage_adapter_reference",
					"related_media_image.storage_adapter_data",
					"related_media_image.public",
					"related_media_image.origin",
					"related_media_image.type",
					"related_media_image.mime_type",
					"related_media_image.file_extension",
					"related_media_image.file_name",
					"related_media_image.file_size",
					"related_media_image.width",
					"related_media_image.height",
					"related_media_image.focal_x",
					"related_media_image.focal_y",
					"related_media_image.blur_hash",
					"related_media_image.average_color",
					"related_media_image.base64",
					"related_media_image.is_dark",
					"related_media_image.is_light",
					activeMediaCropSelect(database, "related_media_image.id"),
					database.fn
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_media_translations")
								.select([
									"lucid_media_translations.title",
									"lucid_media_translations.alt",
									"lucid_media_translations.description",
									"lucid_media_translations.summary",
									"lucid_media_translations.locale_code",
								])
								.whereRef(
									"lucid_media_translations.media_id",
									"=",
									"related_media_image.id",
								),
						)
						.as("translations"),
				])
				.where("related_media_image.id", "=", sql.ref<number>(mediaIdReference))
				.where("related_media_image.parent_media_id", "is", null)
				.where(
					"related_media_image.is_deleted",
					"=",
					database.adapter.getDefault("boolean", "false"),
				),
		)
		.as(alias);
};
