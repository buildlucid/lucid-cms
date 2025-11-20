import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import extractCollectionKey from "../../libs/collection/helpers/extract-collection-key.js";
import {
	getDocumentVersionTableSchema,
	getDocumentFieldsTableSchema,
} from "../../libs/collection/schema/live/schema-filters.js";
import cacheAllSchemas from "../../libs/collection/schema/live/cache-all-schemas.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	DocumentVersionType,
	LucidDocumentTableName,
} from "../../types.js";
import type { BrickQueryResponse } from "../../libs/repositories/document-bricks.js";
import { collectionServices } from "../index.js";

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
	const DocumentVersions = new DocumentVersionsRepository(
		context.db,
		context.config.db,
	);
	if (data.values.length === 0) {
		return {
			data: [],
			error: undefined,
		};
	}

	const collectionKeys = data.values
		.map((v) => extractCollectionKey(v.table))
		.filter((c) => c !== undefined);

	const cacheSchemaRes = await cacheAllSchemas(context, {
		collectionKeys: collectionKeys,
	});
	if (cacheSchemaRes.error) return cacheSchemaRes;

	const unionData = data.values.map(async (v) => {
		const collectionKey = extractCollectionKey(v.table);
		if (!collectionKey) return null;

		const collectionRes = collectionServices.getSingleInstance(context, {
			key: collectionKey,
		});
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
