import type { CoreToolkit, ServiceFn } from "@lucidcms/core/types";
import type { IndexRecord, IndexSource, ResolvedOptions } from "../types.js";
import batches from "../utils/batches.js";
import projectDocuments from "./project-documents.js";
import projectMedia from "./project-media.js";

/** Reads small groups through the toolkit, retaining each group's document references. */
const readRecords: ServiceFn<
	[
		{
			source: IndexSource;
			ids: number[];
			toolkit: CoreToolkit;
			revision: string;
			options: ResolvedOptions;
		},
	],
	IndexRecord[]
> = async (context, data) => {
	const batchSize = context.db.adapter.getQueryBatchSize({
		parametersPerItem: 1,
		// Leave room for the toolkit's version, visibility, locale and pagination filters.
		reservedParameters: 16,
		maxItems: 50,
	});

	const results = await Promise.all(
		[...batches(data.ids, batchSize)].map(async (ids) => {
			if (data.source.kind === "media") {
				const result = await data.toolkit.media.getMultiple({
					query: {
						filter: { id: { value: ids, operator: "in" } },
						perPage: ids.length,
					},
				});
				if (result.error) return result;

				return projectMedia(context, {
					source: data.source,
					media: result.data.data,
					revision: data.revision,
					maxRecordsPerItem: data.options.maxRecordsPerItem,
				});
			}

			const result = await data.toolkit.documents.getMultiple({
				collectionKey: data.source.collection,
				version: data.source.version,
				query: {
					filter: { id: { value: ids, operator: "in" } },
					include: [...(data.source.include ?? [])],
					perPage: ids.length,
				},
			});
			if (result.error) return result;

			return projectDocuments(context, {
				source: data.source,
				documents: result.data.documents,
				refs: result.data.refs ?? {},
				revision: data.revision,
				maxRecordsPerItem: data.options.maxRecordsPerItem,
			});
		}),
	);

	const records: IndexRecord[] = [];
	for (const result of results) {
		if (result.error) return result;
		records.push(...result.data);
	}

	return { error: undefined, data: records };
};

export default readRecords;
