import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { KyselyDB } from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class MediaShareLinksRepository extends StaticRepository<"lucid_media_share_links"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media_share_links");
	}
	tableSchema = z.object({
		id: z.number(),
		media_id: z.number(),
		token: z.string(),
		password: z.string().nullable(),
		expires_at: z.union([z.string(), z.date()]).nullable(),
		name: z.string().nullable(),
		description: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		updated_by: z.number().nullable(),
		created_by: z.number().nullable(),

		media_is_deleted: z.number().nullable().optional(),
		media_key: z.string().nullable().optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		media_id: this.dbAdapter.getDataType("integer"),
		token: this.dbAdapter.getDataType("text"),
		password: this.dbAdapter.getDataType("text"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
		name: this.dbAdapter.getDataType("text"),
		description: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		updated_by: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				mediaId: "media_id",
				updatedBy: "updated_by",
				createdBy: "created_by",
				token: "token",
				name: "name",
			},
			sorts: {
				name: "name",
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
	} as const;

	// ----------------------------------------
	// queries
	async selectSingleWithMediaByToken<V extends boolean = false>(props: {
		token: string;
	}) {
		const exec = await this.executeQuery(
			async () => {
				const query = this.db
					.selectFrom("lucid_media_share_links")
					.innerJoin(
						"lucid_media",
						"lucid_media.id",
						"lucid_media_share_links.media_id",
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
						"lucid_media.key as media_key",
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
			],
		});
	}
}
