import Repository from "../../libs/repositories/index.js";
import extractCollectionKey from "../collection-migrator/helpers/extract-collection-key.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidDocumentTableName } from "../../types.js";
import type { DocumentPropsT } from "../../libs/formatters/documents.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			values: Array<{
				table: LucidDocumentTableName;
				ids: number[];
			}>;
		},
	],
	DocumentPropsT[]
> = async (context, data) => {
	const Documents = Repository.get("documents", context.db, context.config.db);

	if (data.values.length === 0) {
		return {
			data: [],
			error: undefined,
		};
	}

	const unionData = data.values
		.map((v) => {
			const collectionKey = extractCollectionKey(v.table);
			if (!collectionKey) return null;

			const collectionRes = context.services.collection.getSingleInstance(
				context,
				{
					key: collectionKey,
				},
			);
			if (collectionRes.error) return null;

			const versionTable = collectionRes.data.documentVersionTableSchema;
			if (!versionTable) return null;

			const documentFieldsTable = collectionRes.data.documentFieldsTableSchema;
			if (!documentFieldsTable) return null;

			return {
				collectionKey: collectionKey,
				tables: {
					documnet: v.table,
					version: versionTable.name,
					documentFields: documentFieldsTable.name,
				},
				ids: v.ids,
			};
		})
		.filter((u) => u !== null);

	console.log(unionData);

	// TODO: add support to work out versions and collection fields table, then use that to fetch field data for the collection as well.
	const documentsRes = await Documents.selectMultipleByIdsUnion({
		unions: data.values,
		validation: {
			enabled: true,
		},
	});
	if (documentsRes.error) return documentsRes;

	return {
		error: undefined,
		// TODO: update to use new Document formatter
		data: documentsRes.data.map((d) => {
			return {
				id: d.id,
				collection_key: d.collection_key,
				fields: null,
			};
		}),
	};
};

export default getMultipleFieldMeta;
