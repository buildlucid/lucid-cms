import Repository from "../../libs/repositories/index.js";
import extractCollectionKey from "../collection-migrator/helpers/extract-collection-key.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	DocumentVersionType,
	LucidDocumentTableName,
} from "../../types.js";
import type { BrickQueryResponse } from "../../libs/repositories/document-bricks.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			values: Array<{
				table: LucidDocumentTableName;
				ids: number[];
			}>;
			versionType: Exclude<DocumentVersionType, "revision">;
		},
	],
	Array<BrickQueryResponse>
> = async (context, data) => {
	const DocumentVersions = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);
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
		versionType: data.versionType,
		validation: {
			enabled: true,
		},
	});
	if (documentsRes.error) return documentsRes;

	return {
		error: undefined,
		data: documentsRes.data,
	};
};

export default getMultipleFieldMeta;
