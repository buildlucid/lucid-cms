import collections from "../../libs/collection/collections.js";
import buildTableName from "../../libs/collection/helpers/build-table-name.js";
import extractCollectionKey from "../../libs/collection/helpers/extract-collection-key.js";
import primeRuntimeSchemas from "../../libs/collection/schema/runtime/prime-runtime-schemas.js";
import {
	getDocumentFieldsTableSchema,
	getDocumentVersionTableSchema,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import { isDocumentTableName } from "../../libs/db/tables/document-table-name.js";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
} from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { ExternalScopes } from "../../libs/permission/external-scopes.js";
import type {
	DocumentRefData,
	DocumentRefVersionTypeResolver,
} from "../../libs/refs/documents/types.js";
import type { RefResourceTargets } from "../../libs/refs/types.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

type DocumentRefFetchTarget = {
	table: LucidDocumentTableName;
	collectionKey: string;
	ids: number[];
	versionType: Exclude<DocumentVersionType, "revision">;
};

const checkCollectionAccess: ServiceFn<
	[
		{
			targets: RefResourceTargets;
			allowedCollectionKeys?: string[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.allowedCollectionKeys === undefined) {
		return { data: undefined, error: undefined };
	}

	const collectionsRes = await collections.getAll(context, {});
	if (collectionsRes.error) return collectionsRes;

	const tableToCollection = new Map<string, string>();
	for (const collection of collectionsRes.data) {
		const tableNameRes = buildTableName(
			"document",
			{ collection: collection.key },
			context.config.db.config.tableNameByteLimit,
		);
		if (tableNameRes.error) return tableNameRes;
		tableToCollection.set(tableNameRes.data.name, collection.key);
	}

	const allowedCollectionKeys = new Set(data.allowedCollectionKeys);
	const missingCollectionKeys = Array.from(
		new Set(
			Array.from(data.targets.keys()).flatMap((table) => {
				const collectionKey = tableToCollection.get(table);
				return collectionKey && !allowedCollectionKeys.has(collectionKey)
					? [collectionKey]
					: [];
			}),
		),
	);
	if (missingCollectionKeys.length === 0) {
		return { data: undefined, error: undefined };
	}

	const missingScopes = missingCollectionKeys.map((collectionKey) =>
		ExternalScopes.DocumentRead(collectionKey),
	);
	return {
		data: undefined,
		error: {
			type: "authorisation",
			name: copy("server:core.integrations.scopes.error.name"),
			message: copy("server:core.integrations.scopes.missing.message", {
				data: {
					requiredScopes: missingScopes.join(", "),
					missingScopes: missingScopes.join(", "),
				},
			}),
			status: 403,
		},
	};
};

const getDocumentRefs: ServiceFn<
	[
		{
			targets: RefResourceTargets;
			versionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: DocumentRefVersionTypeResolver;
			allowedCollectionKeys?: string[];
		},
	],
	DocumentRefData
> = async (context, data) => {
	const accessRes = await checkCollectionAccess(context, data);
	if (accessRes.error) return accessRes;

	const targetsByVersion = new Map<string, DocumentRefFetchTarget>();
	for (const [targetTable, targetValues] of data.targets) {
		if (!isDocumentTableName(targetTable)) continue;

		const table = targetTable;
		const collectionKey = extractCollectionKey(table);
		if (!collectionKey) continue;

		const ids = Array.from(targetValues).filter(
			(value): value is number => typeof value === "number",
		);
		if (ids.length === 0) continue;

		const versionType =
			data.resolveVersionType?.({
				table,
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
			ids,
			versionType,
		});
	}

	const targets = Array.from(targetsByVersion.values());
	if (targets.length === 0) {
		return {
			error: undefined,
			data: {
				rows: [],
				fieldsSchemaByCollection: {},
			},
		};
	}

	const collectionKeys = Array.from(
		new Set(targets.map((target) => target.collectionKey)),
	);
	const cacheSchemaRes = await primeRuntimeSchemas(context, { collectionKeys });
	if (cacheSchemaRes.error) return cacheSchemaRes;

	const unionResults = await Promise.all(
		targets.map(async (target) => {
			const [versionTableRes, documentFieldsTableRes] = await Promise.all([
				getDocumentVersionTableSchema(context, target.collectionKey),
				getDocumentFieldsTableSchema(context, target.collectionKey),
			]);
			if (versionTableRes.error || !versionTableRes.data) return null;
			if (documentFieldsTableRes.error || !documentFieldsTableRes.data) {
				return null;
			}

			return {
				collectionKey: target.collectionKey,
				tables: {
					document: target.table,
					version: versionTableRes.data.name,
					documentFields: documentFieldsTableRes.data.name,
				},
				documentFieldSchema: documentFieldsTableRes.data,
				ids: target.ids,
				versionType: target.versionType,
			};
		}),
	);
	const unions = unionResults.filter((result) => result !== null);

	const DocumentVersions = new DocumentVersionsRepository(context.db);
	const documentsRes = await DocumentVersions.selectMultipleUnion({
		unions,
		versionType: data.versionType,
		validation: {
			enabled: true,
		},
	});
	if (documentsRes.error) return documentsRes;

	const fieldsSchemaByCollection = Object.fromEntries(
		unions.map((union) => [union.collectionKey, union.documentFieldSchema]),
	) satisfies Record<string, CollectionSchemaTable<LucidBrickTableName>>;

	return {
		error: undefined,
		data: {
			rows: documentsRes.data ?? [],
			fieldsSchemaByCollection,
		},
	};
};

export default getDocumentRefs;
