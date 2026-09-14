import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { ServiceFn } from "@lucidcms/core/types";
import DocumentsRepository from "../repositories/documents.js";
import MediaRepository from "../repositories/media.js";
import type { IndexSource } from "../types.js";

/** Advances through source IDs without relying on offset pagination. */
const scanSource: ServiceFn<
	[{ source: IndexSource; cursor: number; limit: number }],
	Array<{ id: number }>
> = async (context, data) => {
	if (data.source.kind === "media") {
		const Media = new MediaRepository(context.db);
		return Media.scan(data);
	}

	const tables = await getCollectionTableNames(context, data.source.collection);
	if (tables.error) return tables;

	const Documents = new DocumentsRepository(context.db);

	return Documents.scan({
		table: tables.data.document,
		cursor: data.cursor,
		limit: data.limit,
	});
};

export default scanSource;
