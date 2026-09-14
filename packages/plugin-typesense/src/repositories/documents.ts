import { z } from "@lucidcms/core";
import type {
	LucidDocumentTableName,
	ServiceContext,
	ServiceResponse,
} from "@lucidcms/core/types";

/** Keyset scans include trashed documents so active indexes can remove their records. */
export default class DocumentsRepository {
	constructor(private readonly database: ServiceContext["db"]) {}

	async scan(data: {
		table: LucidDocumentTableName;
		cursor: number;
		limit: number;
	}): ServiceResponse<Array<{ id: number }>> {
		return this.database
			.query("typesense.documents.scan", (db) =>
				db
					.selectFrom(data.table)
					.select("id")
					.where("id", ">", data.cursor)
					.orderBy("id")
					.limit(data.limit),
			)
			.many({ schema: z.object({ id: z.number().int() }) });
	}
}
