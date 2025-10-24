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
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		updated_by: z.number().nullable(),
		created_by: z.number().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		media_id: this.dbAdapter.getDataType("integer"),
		token: this.dbAdapter.getDataType("text"),
		password: this.dbAdapter.getDataType("text"),
		expires_at: this.dbAdapter.getDataType("timestamp"),
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
			},
			sorts: {
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
	} as const;
}
