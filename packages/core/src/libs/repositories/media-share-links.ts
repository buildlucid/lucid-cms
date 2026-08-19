import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { mediaShareLinksTable } from "../db/tables/media-share-links.js";
import StaticRepository from "./parents/static-repository.js";

export default class MediaShareLinksRepository extends StaticRepository<"lucid_media_share_links"> {
	constructor(db: LucidDatabase) {
		super(db, mediaShareLinksTable);
	}

	// ----------------------------------------
	// queries
	async selectSingleWithMediaByToken(props: { token: string }) {
		const exec = await this.executeQuery(
			async () => {
				const query = this.db
					.selectFrom("lucid_media_share_links")
					.innerJoin(
						"lucid_media",
						"lucid_media.id",
						"lucid_media_share_links.media_id",
					)
					.leftJoin("lucid_media as active_crop", (join) =>
						join
							.onRef("active_crop.parent_media_id", "=", "lucid_media.id")
							.on("active_crop.relation_type", "=", "crop")
							.on(
								"active_crop.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.leftJoin("lucid_media as poster", (join) =>
						join
							.onRef("poster.parent_media_id", "=", "lucid_media.id")
							.on("poster.relation_type", "=", "poster")
							.on(
								"poster.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.leftJoin("lucid_media as poster_crop", (join) =>
						join
							.onRef("poster_crop.parent_media_id", "=", "poster.id")
							.on("poster_crop.relation_type", "=", "crop")
							.on(
								"poster_crop.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.select([
						"lucid_media_share_links.id",
						"lucid_media_share_links.media_id",
						"lucid_media_share_links.token",
						"lucid_media_share_links.password",
						"lucid_media_share_links.expires_at",
						"lucid_media_share_links.name",
						"lucid_media_share_links.description",
						"lucid_media_share_links.created_at",
						"lucid_media_share_links.updated_at",
						"lucid_media_share_links.updated_by",
						"lucid_media_share_links.created_by",
						"lucid_media.is_deleted as media_is_deleted",
						sql<string>`COALESCE(active_crop.key, lucid_media.key)`.as(
							"media_key",
						),
						sql<
							"original" | "crop"
						>`CASE WHEN active_crop.id IS NULL THEN 'original' ELSE 'crop' END`.as(
							"media_source_type",
						),
						"lucid_media.origin as media_origin",
						"lucid_media.type as media_type",
						sql<string>`COALESCE(active_crop.mime_type, lucid_media.mime_type)`.as(
							"media_mime_type",
						),
						sql<string>`COALESCE(active_crop.file_extension, lucid_media.file_extension)`.as(
							"media_file_extension",
						),
						sql<number>`COALESCE(active_crop.file_size, lucid_media.file_size)`.as(
							"media_file_size",
						),
						sql<
							number | null
						>`COALESCE(active_crop.width, lucid_media.width)`.as("media_width"),
						sql<
							number | null
						>`COALESCE(active_crop.height, lucid_media.height)`.as(
							"media_height",
						),
						"lucid_media.duration as media_duration",
						sql<
							number | null
						>`COALESCE(active_crop.focal_x, lucid_media.focal_x)`.as(
							"media_focal_x",
						),
						sql<
							number | null
						>`COALESCE(active_crop.focal_y, lucid_media.focal_y)`.as(
							"media_focal_y",
						),
						sql<string | null>`COALESCE(poster_crop.key, poster.key)`.as(
							"media_poster_key",
						),
						"poster.type as media_poster_type",
					])
					.where("lucid_media_share_links.token", "=", props.token)
					.limit(1);

				return query.executeTakeFirst();
			},
			{ method: "selectSingleWithMediaByToken" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: true,
			mode: "single",
			select: [
				"id",
				"media_id",
				"token",
				"password",
				"expires_at",
				"name",
				"description",
				"created_at",
				"updated_at",
				"updated_by",
				"created_by",
				"media_is_deleted",
				"media_key",
				"media_source_type",
				"media_origin",
				"media_type",
				"media_mime_type",
				"media_file_extension",
				"media_file_size",
				"media_width",
				"media_height",
				"media_duration",
				"media_focal_x",
				"media_focal_y",
				"media_poster_key",
				"media_poster_type",
			],
		});
	}
}
