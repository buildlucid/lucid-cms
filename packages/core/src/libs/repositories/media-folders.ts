import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { QueryProps } from "./types.js";

export default class MediaFoldersRepository extends StaticRepository<"lucid_media_folders"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media_folders");
	}
	tableSchema = z.object({
		id: z.number(),
		title: z.string(),
		parent_folder_id: z.number().nullable(),
		created_by: z.number().nullable(),
		updated_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		title: this.dbAdapter.getDataType("text"),
		parent_folder_id: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
		updated_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				title: "title",
				parentFolderId: "parent_folder_id",
				createdBy: "created_by",
			},
			sorts: {
				title: "title",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
	} as const;

	// ----------------------------------------
	// queries
	async checkCircularParents(props: {
		folderId: number;
		parentFolderId: number;
	}) {
		const query = this.db
			.withRecursive("ancestors", (db) =>
				db
					.selectFrom("lucid_media_folders")
					.select(["id as current_id", "parent_folder_id as parent_id"])
					.where("id", "=", props.parentFolderId)
					.unionAll(
						db
							.selectFrom("lucid_media_folders")
							.innerJoin(
								"ancestors",
								"ancestors.parent_id",
								"lucid_media_folders.id",
							)
							.select([
								"lucid_media_folders.id as current_id",
								"lucid_media_folders.parent_folder_id as parent_id",
							]),
					),
			)
			.selectFrom("ancestors")
			.select("parent_id")
			.where("parent_id", "=", props.folderId);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "checkCircularParents",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "single",
			select: ["parent_id"],
		});
	}
}
