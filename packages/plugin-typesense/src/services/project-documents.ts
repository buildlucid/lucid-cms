import { copy } from "@lucidcms/core";
import {
	isCollectionFieldLocalized,
	resolveCollectionLocalization,
} from "@lucidcms/core/extension";
import type { CollectionDocument, Refs, ServiceFn } from "@lucidcms/core/types";
import type { CollectionSource, IndexRecord } from "../types.js";
import normalizeRecords from "../utils/normalize-records.js";

/** Projects formatted content and validates JSON before crossing the provider boundary. */
const projectDocuments: ServiceFn<
	[
		{
			source: CollectionSource;
			documents: CollectionDocument<string>[];
			refs: Refs;
			revision: string;
			maxRecordsPerItem: number;
		},
	],
	IndexRecord[]
> = async (context, data) => {
	const collection = context.config.collections.find(
		(entry) => entry.key === data.source.collection,
	);
	if (!collection) {
		return {
			error: { message: copy("server:plugin.typesense.collection.missing") },
			data: undefined,
		};
	}

	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection,
	});
	const collectionFields = collection.fields;
	const selections = Object.entries(data.source.fields ?? {}).map(
		([name, selection]) => {
			const field =
				typeof selection === "string"
					? collectionFields.get(selection)
					: undefined;
			return {
				name,
				selection,
				localized:
					field !== undefined &&
					isCollectionFieldLocalized(localization, field),
			};
		},
	);

	const records: IndexRecord[] = [];
	try {
		for (const document of data.documents) {
			for (const locale of data.source.locales ?? [null]) {
				const input = { document, locale, refs: data.refs };
				if (data.source.condition && !data.source.condition(input)) continue;
				let projected: unknown;
				if (data.source.project) {
					projected = data.source.project(input);
				} else {
					const fields: Record<string, unknown> = {};
					for (const { name, selection, localized } of selections) {
						if (typeof selection === "function") {
							fields[name] = selection(input);
							continue;
						}
						const value = document.fields[selection];
						fields[name] =
							locale !== null &&
							localized &&
							value !== null &&
							typeof value === "object" &&
							!Array.isArray(value)
								? Object.entries(value).find(([key]) => key === locale)?.[1]
								: value;
					}
					projected = fields;
				}

				const normalized = normalizeRecords({
					records: projected,
					sourceKey: data.source.key,
					itemId: document.id,
					locale,
					revision: data.revision,
					limit: data.maxRecordsPerItem,
				});
				if (normalized.error) return normalized;

				records.push(...normalized.data);
			}
		}
	} catch {
		return {
			error: { message: copy("server:plugin.typesense.projection.failed") },
			data: undefined,
		};
	}

	return { error: undefined, data: records };
};

export default projectDocuments;
