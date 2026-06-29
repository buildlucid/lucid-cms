import type { FieldRefVersionTypeResolver } from "../../libs/collection/custom-fields/utils/ref-fetch.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/types.js";
import {
	documentBricksFormatter,
	documentsFormatter,
} from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import type {
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
} from "../../types/response.js";
import type { FieldTypes } from "../../types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getSingleInstance } from "../collections/index.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRefData, {
	type FieldRefResponse,
} from "./helpers/fetch-ref-data.js";

/**
 * Returns all of the bricks and collection fields
 */
const getMultiple: ServiceFn<
	[
		{
			versionId: number;
			collectionKey: string;
			/** The version type to use for any custom field document references  */
			versionType: Exclude<DocumentVersionType, "revision">;
			resolveVersionType?: FieldRefVersionTypeResolver;
			/** When disabled, only collection-level field tables are fetched. */
			includeBricks?: boolean;
			/** When disabled, reference rows are not hydrated. */
			includeRefs?: boolean;
			/** When provided, only these custom field ref types are hydrated. */
			refTypes?: FieldTypes[];
			/** Client responses flatten nested document ref fields; internal responses keep field wrappers. */
			flattenDocumentRefFields?: boolean;
		},
	],
	{
		bricks: Array<InternalDocumentBrick>;
		fields: Array<InternalDocumentField>;
		refs: InternalCollectionDocument["refs"];
	}
> = async (context, data) => {
	const DocumentBricks = new DocumentBricksRepository(
		context.db.client,
		context.config.db,
	);

	const collectionRes = getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const includeBricks = data.includeBricks ?? true;
	const includeRefs = data.includeRefs ?? true;
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

	let refData: FieldRefResponse = { data: {} };

	if (includeRefs) {
		const relationIdRes = await extractRelatedEntityIds(context, {
			collection: collectionRes.data,
			brickSchema: selectedBricksTableSchema,
			responses: [bricksQueryRes.data],
			includeTypes: data.refTypes,
		});
		if (relationIdRes.error) return relationIdRes;

		const refDataRes = await fetchRefData(context, {
			values: relationIdRes.data,
			versionType: data.versionType,
			resolveVersionType: data.resolveVersionType,
		});
		if (refDataRes.error) return refDataRes;

		refData = refDataRes.data;
	}

	const baseUrl = getBaseUrl(context);

	return {
		error: undefined,
		data: {
			bricks: includeBricks
				? documentBricksFormatter.formatMultiple({
						bricksQuery: bricksQueryRes.data,
						bricksSchema: selectedBricksTableSchema,
						refData: refData,
						collection: collectionRes.data,
						config: context.config,
						host: baseUrl,
					})
				: [],
			fields: documentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: selectedBricksTableSchema,
				refData: refData,
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
			}),
			refs: includeRefs
				? documentsFormatter.formatRefs({
						collection: collectionRes.data,
						config: context.config,
						host: baseUrl,
						bricksTableSchema: selectedBricksTableSchema,
						data: refData,
						fieldTypes: data.refTypes,
						flattenDocumentRefFields: data.flattenDocumentRefFields,
					})
				: null,
		},
	};
};

export default getMultiple;
