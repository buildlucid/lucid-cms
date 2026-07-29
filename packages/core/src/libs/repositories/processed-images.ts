import { sql } from "kysely";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class ProcessedImagesRepository extends StaticRepository<"lucid_processed_images"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_processed_images");
	}
	tableSchema = z.object({
		key: z.string(),
		media_key: z.string(),
		file_size: z.number(),
	});
	columnFormats = {
		key: this.dbAdapter.getDataType("text"),
		media_key: this.dbAdapter.getDataType("text"),
		file_size: this.dbAdapter.getDataType("integer"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async sumFileSize() {
		const query = this.db
			.selectFrom("lucid_processed_images")
			.select(sql<string | number>`COALESCE(SUM(file_size), 0)`.as("total"));

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					{ total: string | number | null } | undefined
				>,
			{
				method: "sumFileSize",
			},
		);
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.total ?? 0),
		};
	}
}
