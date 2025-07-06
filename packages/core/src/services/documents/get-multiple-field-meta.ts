import Repository from "../../libs/repositories/index.js";
import extractCollectionKey from "../collection-migrator/helpers/extract-collection-key.js";
import {
	getDocumentVersionTableSchema,
	getDocumentFieldsTableSchema,
	syncAllDbSchemas,
} from "../../libs/collection/schema/index.js";
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

	const collectinosKeys = data.values
		.map((v) => extractCollectionKey(v.table))
		.filter((c) => c !== undefined);

	const syncRes = await syncAllDbSchemas(context, collectinosKeys);
	if (syncRes.error) return syncRes;

	const unionData = data.values.map(async (v) => {
		const collectionKey = extractCollectionKey(v.table);
		if (!collectionKey) return null;

		const collectionRes = context.services.collection.getSingleInstance(
			context,
			{
				key: collectionKey,
			},
		);
		if (collectionRes.error) return null;

		const [versionTableRes, documentFieldsTableRes] = await Promise.all([
			getDocumentVersionTableSchema(context, collectionKey),
			getDocumentFieldsTableSchema(context, collectionKey),
		]);
		if (versionTableRes.error || !versionTableRes.data) return null;
		if (documentFieldsTableRes.error || !documentFieldsTableRes.data)
			return null;

		return {
			collectionKey: collectionKey,
			tables: {
				document: v.table,
				version: versionTableRes.data.name,
				documentFields: documentFieldsTableRes.data.name,
			},
			documentFieldSchema: documentFieldsTableRes.data,
			ids: v.ids,
		};
	});
	const unionDataRes = await Promise.all(unionData).then((u) =>
		u.filter((u) => u !== null),
	);

	const documentsRes = await DocumentVersions.selectMultipleUnion({
		unions: unionDataRes,
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
