import constants from "../../constants/constants.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../../libs/collection/custom-fields/storage/index.js";
import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/types.js";
import formatter, { documentsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/documents.js";
import type { InternalCollectionDocument } from "../../types/response.js";
import {
	getBaseUrl,
	getFilterValues,
	groupDocumentFilterConditions,
	groupDocumentFilters,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import extractRelatedEntityIds from "../documents-bricks/helpers/extract-related-entity-ids.js";
import fetchRefData, {
	type FieldRefResponse,
} from "../documents-bricks/helpers/fetch-ref-data.js";
import { collectionServices } from "../index.js";
import resolveDocumentIncludes from "./helpers/resolve-document-includes.js";
import resolveRelationDocumentFilters from "./helpers/resolve-relation-document-filters.js";
import resolveRelationVersionType from "./helpers/resolve-relation-version-type.js";

const getMultiple: ServiceFn<
	[
		{
			collectionKey: string;
			version: DocumentVersionType;
			query: GetMultipleQueryParams;
		},
	],
	{
		data: InternalCollectionDocument[];
		count: number;
	}
> = async (context, data) => {
	if (
		data.version === constants.collectionBuilder.publishing.snapshotVersionType
	) {
		return {
			error: {
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const Document = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const documentFieldsTableSchemaRes = await getDocumentFieldsTableSchema(
		context,
		data.collectionKey,
	);
	if (documentFieldsTableSchemaRes.error) return documentFieldsTableSchemaRes;

	const includeWorkflow = Boolean(collectionRes.data.getData.workflow);
	const documentFieldRelationTableSchemas = bricksTableSchemaRes.data.filter(
		(schema) => {
			const databaseConfig = getFieldDatabaseConfig(schema.type);
			const fieldKey = schema.key.fieldPath?.[schema.key.fieldPath.length - 1];

			return (
				databaseConfig !== null &&
				isStorageMode(databaseConfig, "relation-table") &&
				schema.key.brick === undefined &&
				fieldKey !== undefined &&
				collectionRes.data.listing.includes(fieldKey)
			);
		},
	);

	const [relationVersionTypeRes, tableNameRes] = await Promise.all([
		resolveRelationVersionType(context, {
			collectionKey: data.collectionKey,
			versionType: data.version,
		}),
		getTableNames(context, data.collectionKey),
	]);
	if (relationVersionTypeRes.error) return relationVersionTypeRes;
	if (tableNameRes.error) return tableNameRes;

	const relationFiltersRes = await resolveRelationDocumentFilters(context, {
		collection: collectionRes.data,
		bricksTableSchema: bricksTableSchemaRes.data,
		filter: data.query.filter,
		filterOr: data.query.filterOr,
		relationVersionType: relationVersionTypeRes.data.versionType,
		resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
	});
	if (relationFiltersRes.error) return relationFiltersRes;
	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		data.query.filter,
		{
			includeWorkflow,
			relationCollectionDefaults:
				relationFiltersRes.data.relationCollectionDefaults,
		},
	);
	const workflowAssigneeFilterValues = getFilterValues(
		documentFilters.workflowAssignee,
	);

	const filterOr = data.query.filterOr?.map((group, index) => ({
		...groupDocumentFilterConditions(bricksTableSchemaRes.data, group, {
			includeWorkflow,
			relationCollectionDefaults:
				relationFiltersRes.data.relationCollectionDefaults,
		}),
		relationDocumentFilters: relationFiltersRes.data.filterOr[index] ?? [],
	}));
	const include = resolveDocumentIncludes(data.query.include);

	const documentsRes = await Document.selectMultipleFiltered(
		{
			version: data.version,
			query: data.query,
			documentFilters,
			filterOr,
			brickFilters: brickFilters,
			relationDocumentFilters: relationFiltersRes.data.filters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: relationVersionTypeRes.data.versionType,
			tables: {
				versions: tableNameRes.data.version,
				documentFields: tableNameRes.data.documentFields,
			},
			documentFieldsTableSchema: documentFieldsTableSchemaRes.data,
			documentFieldRelationTableSchemas,
			includeWorkflow,
			workflowAssigneeFilterValues,
			tenantKey: context.request.tenantKey,
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	let refData: FieldRefResponse | undefined;
	if (include.refs) {
		const relationIdRes = await extractRelatedEntityIds(context, {
			collection: collectionRes.data,
			brickSchema: bricksTableSchemaRes.data,
			responses: documentsRes.data?.[0] ?? [],
			includeTypes: include.refTypes,
		});
		if (relationIdRes.error) return relationIdRes;

		const refDataRes = await fetchRefData(context, {
			values: relationIdRes.data,
			versionType: relationVersionTypeRes.data.versionType,
			resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		});
		if (refDataRes.error) return refDataRes;

		refData = refDataRes.data;
	}

	const documents = documentsFormatter.formatMultiple({
		documents: documentsRes.data?.[0] || [],
		collection: collectionRes.data,
		config: context.config,
		host: getBaseUrl(context),
		refData,
		refTypes: include.refTypes,
		hasFields: true,
		hasBricks: false,
		bricksTableSchema: bricksTableSchemaRes.data,
	});

	const afterFetchRes = await executeHooks(
		context,
		{
			service: "documents",
			event: "afterFetch",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				collectionTableNames: tableNameRes.data,
				tenantKey: context.request.tenantKey ?? null,
			},
			data: {
				versionType: data.version,
				relationVersionType: relationVersionTypeRes.data.versionType,
				documents,
			},
		},
	);
	if (afterFetchRes.error) return afterFetchRes;

	return {
		error: undefined,
		data: {
			data: afterFetchRes.data.documents,
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
