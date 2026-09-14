import { z } from "@lucidcms/core";
import type { ServiceContext, ServiceResponse } from "@lucidcms/core/types";

export default class MediaRepository {
	constructor(private readonly database: ServiceContext["db"]) {}

	/** Include deleted and hidden roots so scans can remove records that became ineligible. */
	scan(data: {
		cursor: number;
		limit: number;
	}): ServiceResponse<Array<{ id: number }>> {
		return this.database
			.query("typesense.media.scan", (db) =>
				db
					.selectFrom("lucid_media")
					.select("id")
					.where("parent_media_id", "is", null)
					.where("id", ">", data.cursor)
					.orderBy("id")
					.limit(data.limit),
			)
			.many({ schema: z.object({ id: z.number().int() }) });
	}
}
