import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { processedImagesTable } from "../db/tables/processed-images.js";
import StaticRepository from "./parents/static-repository.js";

export default class ProcessedImagesRepository extends StaticRepository<"lucid_processed_images"> {
	constructor(db: LucidDatabase) {
		super(db, processedImagesTable);
	}

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
