import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import extractCollectionKey from "../collection-migrator/helpers/extract-collection-key.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidDocumentTableName } from "../../types.js";
import type { BrickQueryResponse } from "../../libs/repositories/document-bricks.js";
import { inspect } from "node:util";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			values: Array<{
				table: LucidDocumentTableName;
				ids: number[];
			}>;
		},
	],
	Array<BrickQueryResponse>
> = async (context, data) => {
	const DocumentVersions = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);
	const DocumentBricksFormatter = Formatter.get("document-bricks");

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
					document: v.table,
					version: versionTable.name,
					documentFields: documentFieldsTable.name,
				},
				documentFieldSchema: documentFieldsTable,
				ids: v.ids,
			};
		})
		.filter((u) => u !== null);

	const documentsRes = await DocumentVersions.selectMultipleUnion({
		unions: unionData,
		// TODO: change to use prop on service
		versionType: "draft",
		validation: {
			enabled: true,
		},
	});
	if (documentsRes.error) return documentsRes;

	console.log(
		inspect(
			documentsRes.data
				.map((res) => {
					const collectionRes = context.services.collection.getSingleInstance(
						context,
						{
							key: res.collection_key,
						},
					);
					if (collectionRes.error) return null;

					return {
						id: res.document_id,
						collectionKey: res.collection_key,
						fields: DocumentBricksFormatter.formatDocumentFields({
							bricksQuery: res,
							bricksSchema: collectionRes.data.bricksTableSchema,
							relationMetaData: {},
							collection: collectionRes.data,
							config: context.config,
						}),
					};
				})
				.filter((i) => i !== null),
			{
				depth: Number.POSITIVE_INFINITY,
				colors: true,
				numericSeparator: true,
			},
		),
	);

	// TODO: just return raw data and let the document custom field be responsible for formatting the meta data
	return {
		error: undefined,
		data: documentsRes.data,
	};
};

export default getMultipleFieldMeta;
