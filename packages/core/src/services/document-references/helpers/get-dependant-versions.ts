import type { RefResource } from "../../../exports/types.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentReferencesRepository,
	DocumentVersionsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { resolveRelatedDocumentVersionType } from "../../documents/helpers/resolve-relation-version-type.js";

export type ChangedTarget = {
	resource: RefResource;
	table: string;
	ids: number[];
	collectionKey?: string;
	version?: string;
};

type DependantVersion = {
	collectionKey: string;
	documentId: number;
	version: string;
	table: string;
};

/** Finds current owner versions affected by a target's change. Historical versions
 * keep their references, but do not produce notifications for current content. */
const getDependantVersions: ServiceFn<
	[
		{
			target: ChangedTarget;
			collections: CollectionBuilder[];
			batchSize: number;
		},
	],
	DependantVersion[]
> = async (context, data) => {
	const DocumentReferences = new DocumentReferencesRepository(context.db);
	const DocumentVersions = new DocumentVersionsRepository(context.db);
	const versionIdsByCollection = new Map<string, Set<number>>();
	const { target, batchSize } = data;

	// Collect all owners first so a version shared by several target batches is read once.
	for (let offset = 0; offset < target.ids.length; offset += batchSize) {
		const references = await DocumentReferences.selectDependants({
			resource: target.resource,
			table: target.table,
			ids: target.ids.slice(offset, offset + batchSize),
		});
		if (references.error) return references;

		for (const row of references.data) {
			let ids = versionIdsByCollection.get(row.collection_key);
			if (!ids) {
				ids = new Set<number>();
				versionIdsByCollection.set(row.collection_key, ids);
			}
			ids.add(row.version_id);
		}
	}

	const dependants: DependantVersion[] = [];
	for (const collection of data.collections) {
		const versionIds = versionIdsByCollection.get(collection.key);
		if (!versionIds) continue;

		const tables = await getTableNames(context, collection.key);
		if (tables.error) return tables;

		const table = buildTableName(
			"document",
			{ collection: collection.key },
			null,
		);
		if (table.error) return table;

		// Resolve the publication perspective once per version type, rather than per document.
		const affectedTypes = new Set(
			[
				"latest",
				...collection.getData.publishing.targets.map((item) => item.key),
			].filter(
				(version) =>
					target.version === undefined ||
					resolveRelatedDocumentVersionType({
						collections: data.collections,
						sourceCollectionKey: collection.key,
						sourceVersionType: version,
						targetCollectionKey: target.collectionKey,
					}) === target.version,
			),
		);
		if (affectedTypes.size === 0) continue;

		const ids = [...versionIds];
		for (let offset = 0; offset < ids.length; offset += batchSize) {
			const versions = await DocumentVersions.selectExistingDocumentVersions(
				{
					ids: ids.slice(offset, offset + batchSize),
					documentTable: tables.data.document,
				},
				{ tableName: tables.data.version },
			);
			if (versions.error) return versions;

			for (const version of versions.data) {
				if (!affectedTypes.has(version.type)) continue;

				dependants.push({
					collectionKey: collection.key,
					documentId: version.document_id,
					version: version.type,
					table: table.data.name,
				});
			}
		}
	}

	return { error: undefined, data: dependants };
};

export default getDependantVersions;
