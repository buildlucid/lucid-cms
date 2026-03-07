import { collectionServices } from "../../../../../services/index.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
} from "../../../../../types.js";
import type { ServiceFn } from "../../../../../utils/services/types.js";
import type { BrickQueryResponse } from "../../../../repositories/document-bricks.js";
import { DocumentVersionsRepository } from "../../../../repositories/index.js";
import extractCollectionKey from "../../../helpers/extract-collection-key.js";
import primeRuntimeSchemas from "../../../schema/runtime/prime-runtime-schemas.js";
import {
	getDocumentFieldsTableSchema,
	getDocumentVersionTableSchema,
} from "../../../schema/runtime/runtime-schema-selectors.js";
import type { CollectionSchemaTable } from "../../../schema/types.js";
import type {
	FieldRefFetchInput,
	FieldRefFetchOutput,
} from "../../utils/ref-fetch.js";

const fetchDocumentRefs: ServiceFn<
	[FieldRefFetchInput],
	FieldRefFetchOutput
> = async (context, data) => {
	const DocumentVersions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);

	const values = data.relations.flatMap((relation) => {
		if (!relation.table.startsWith("lucid_doc__")) return [];

		const ids = Array.from(relation.values).filter(
			(value): value is number => typeof value === "number",
		);
		return [
			{
				table: relation.table as LucidDocumentTableName,
				ids,
			},
		];
	});

	if (values.length === 0) {
		return {
			data: {
				rows: [] satisfies Array<BrickQueryResponse>,
				meta: {
					document: {
						fieldsSchemaByCollection: {},
					},
				},
			},
			error: undefined,
		};
	}

	const collectionKeys = values
		.map((v) => extractCollectionKey(v.table))
		.filter((c) => c !== undefined);

	const cacheSchemaRes = await primeRuntimeSchemas(context, {
		collectionKeys: collectionKeys,
	});
	if (cacheSchemaRes.error) return cacheSchemaRes;

	const unionData = values.map(async (v) => {
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

	const documentFieldsSchemaByCollection = new Map<
		string,
		CollectionSchemaTable<LucidBrickTableName>
	>();
	for (const union of unionDataRes) {
		documentFieldsSchemaByCollection.set(
			union.collectionKey,
			union.documentFieldSchema,
		);
	}
	const fieldsSchemaByCollection = Object.fromEntries(
		documentFieldsSchemaByCollection.entries(),
	);

	return {
		error: undefined,
		data: {
			rows: documentsRes.data || [],
			meta: {
				document: {
					fieldsSchemaByCollection,
				},
			},
		},
	};
};

export default fetchDocumentRefs;
