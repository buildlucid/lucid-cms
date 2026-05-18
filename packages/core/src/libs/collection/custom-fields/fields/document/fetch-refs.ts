import { collectionServices } from "../../../../../services/index.js";
import type {
	DocumentVersionType,
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

type DocumentRefFetchTarget = {
	table: LucidDocumentTableName;
	collectionKey: string;
	ids: number[];
	versionType: Exclude<DocumentVersionType, "revision">;
};

const fetchDocumentRefs: ServiceFn<
	[FieldRefFetchInput],
	FieldRefFetchOutput
> = async (context, data) => {
	const DocumentVersions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);

	const targetsByVersion = new Map<string, DocumentRefFetchTarget>();
	for (const relation of data.relations) {
		if (!relation.table.startsWith("lucid_document__")) continue;

		const table = relation.table as LucidDocumentTableName;
		const collectionKey = extractCollectionKey(table);
		if (!collectionKey) continue;

		const ids = Array.from(relation.values).filter(
			(value): value is number => typeof value === "number",
		);
		if (ids.length === 0) continue;

		const versionType =
			data.resolveVersionType?.({
				fieldType: "document",
				table: relation.table,
				collectionKey,
			}) ?? data.versionType;
		const mapKey = `${table}:${versionType}`;
		const existing = targetsByVersion.get(mapKey);

		if (existing) {
			existing.ids = Array.from(new Set([...existing.ids, ...ids]));
			continue;
		}

		targetsByVersion.set(mapKey, {
			table,
			collectionKey,
			ids: Array.from(new Set(ids)),
			versionType,
		});
	}

	const values = Array.from(targetsByVersion.values());

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
		.map((v) => v.collectionKey)
		.filter((c, i, self) => self.indexOf(c) === i);

	const cacheSchemaRes = await primeRuntimeSchemas(context, {
		collectionKeys: collectionKeys,
	});
	if (cacheSchemaRes.error) return cacheSchemaRes;

	const unionData = values.map(async (v) => {
		const collectionRes = collectionServices.getSingleInstance(context, {
			key: v.collectionKey,
		});
		if (collectionRes.error) return null;

		const [versionTableRes, documentFieldsTableRes] = await Promise.all([
			getDocumentVersionTableSchema(context, v.collectionKey),
			getDocumentFieldsTableSchema(context, v.collectionKey),
		]);
		if (versionTableRes.error || !versionTableRes.data) return null;
		if (documentFieldsTableRes.error || !documentFieldsTableRes.data)
			return null;

		return {
			collectionKey: v.collectionKey,
			tables: {
				document: v.table,
				version: versionTableRes.data.name,
				documentFields: documentFieldsTableRes.data.name,
			},
			documentFieldSchema: documentFieldsTableRes.data,
			ids: v.ids,
			versionType: v.versionType,
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
