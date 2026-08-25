import collections from "../../libs/collection/collections.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/tables/index.js";
import { documentBricksFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import type { DocumentRefVersionTypeResolver } from "../../libs/refs/documents/types.js";
import type { RefResourceSelection, RefTarget } from "../../libs/refs/types.js";
import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import type {
	InternalDocumentBrick,
	InternalDocumentField,
	Refs,
} from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveDocumentRefs from "../documents/helpers/resolve-document-refs.js";

/**
 * Returns all of the bricks and collection fields
 */
const getMultiple: ServiceFn<
	[
		{
			versionId: number;
			collectionKey: string;
			/** The version type to use for any custom field relation refs  */
			versionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: DocumentRefVersionTypeResolver;
			/** When disabled, only collection-level field tables are fetched. */
			includeBricks?: boolean;
			/** Response ref resources to expose. Defaults to all resources. */
			refResources?: RefResourceSelection;
			/** Content responses flatten nested relation ref fields; internal responses keep field wrappers. */
			flattenRelationRefFields?: boolean;
			/** Restricts hydrated document relation refs for external integrations. */
			allowedDocumentCollectionKeys?: string[];
			/** Built-in document refs contributed outside custom field storage. */
			refTargets?: Iterable<RefTarget>;
		},
	],
	{
		bricks: Array<InternalDocumentBrick>;
		fields: Array<InternalDocumentField>;
		refs: Refs | null;
	}
> = async (context, data) => {
	const DocumentBricks = new DocumentBricksRepository(context.db);

	const [collectionRes, collectionsRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		collections.getAll(context, {}),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const includeBricks = data.includeBricks ?? true;
	const refResources =
		data.refResources === undefined ? "all" : data.refResources;
	const selectedBricksTableSchema = bricksTableSchemaRes.data.filter(
		(schema) => {
			if (includeBricks) return true;
			return schema.key.brick === undefined;
		},
	);

	const bricksQueryRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionId: data.versionId,
			bricksSchema: selectedBricksTableSchema,
		},
		{
			tableName: tableNameRes.data.version,
		},
	);
	if (bricksQueryRes.error) return bricksQueryRes;

	if (bricksQueryRes.data === undefined) {
		return {
			error: {
				status: 404,
				message: copy("server:core.documents.version.not.found.message"),
			},
			data: undefined,
		};
	}

	const baseUrl = getBaseUrl(context);
	const refsRes = await resolveDocumentRefs(context, {
		collection: collectionRes.data,
		collections: collectionsRes.data,
		brickSchema: selectedBricksTableSchema,
		responses: [bricksQueryRes.data],
		versionType: data.versionType,
		resolveVersionType: data.resolveVersionType,
		refResources,
		refTargets: data.refTargets,
		allowedDocumentCollectionKeys: data.allowedDocumentCollectionKeys,
		host: baseUrl,
		flattenRelationRefFields: data.flattenRelationRefFields,
	});
	if (refsRes.error) return refsRes;

	return {
		error: undefined,
		data: {
			bricks: includeBricks
				? documentBricksFormatter.formatMultiple({
						bricksQuery: bricksQueryRes.data,
						bricksSchema: selectedBricksTableSchema,
						refs: refsRes.data.hydratedRefs,
						collection: collectionRes.data,
						config: context.config,
						host: baseUrl,
					})
				: [],
			fields: documentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: selectedBricksTableSchema,
				refs: refsRes.data.hydratedRefs,
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
			}),
			refs: refsRes.data.refs ?? null,
		},
	};
};

export default getMultiple;
