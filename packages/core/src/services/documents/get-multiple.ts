import constants from "../../constants/constants.js";
import collections from "../../libs/collection/collections.js";
import {
	getFieldDatabaseConfig,
	isStorageMode,
} from "../../libs/collection/custom-fields/storage/index.js";
import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db/tables/index.js";
import formatter, { documentsFormatter } from "../../libs/formatters/index.js";
import executeHooks from "../../libs/hooks/execute-hooks.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/documents.js";
import type { InternalCollectionDocument, Refs } from "../../types/response.js";
import {
	getBaseUrl,
	getFilterValues,
	groupDocumentFilterConditions,
	groupDocumentFilters,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import collectDocumentRefTargets from "./helpers/collect-document-ref-targets.js";
import resolveDocumentIncludes from "./helpers/resolve-document-includes.js";
import resolveDocumentRefs from "./helpers/resolve-document-refs.js";
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
		documents: InternalCollectionDocument[];
		count: number;
		refs?: Refs;
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

	const [collectionRes, collectionsRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		collections.getAll(context, {}),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;

	const Document = new DocumentsRepository(context.db);

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
	const includeWorkflow = Boolean(
		collectionRes.data.getData.publishing.workflow,
	);
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

	const environmentKeys = new Set(
		collectionRes.data.getData.publishing.targets.map(
			(environment) => environment.key,
		),
	);

	const { documentFilters, brickFilters, environmentStatusFilters } =
		groupDocumentFilters(bricksTableSchemaRes.data, data.query.filter, {
			includeWorkflow,
			environmentKeys,
			relationCollectionDefaults:
				relationFiltersRes.data.relationCollectionDefaults,
		});

	const workflowAssigneeFilterValues = getFilterValues(
		documentFilters.workflowAssignee,
	);

	const filterOr = data.query.filterOr?.map((group, index) => ({
		...groupDocumentFilterConditions(bricksTableSchemaRes.data, group, {
			includeWorkflow,
			environmentKeys,
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
			environmentStatusFilters,
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
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const baseUrl = getBaseUrl(context);
	const refsRes = await resolveDocumentRefs(context, {
		collection: collectionRes.data,
		collections: collectionsRes.data,
		brickSchema: bricksTableSchemaRes.data,
		responses: documentsRes.data?.[0] ?? [],
		versionType: relationVersionTypeRes.data.versionType,
		resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		refResources: include.refs,
		refTargets: collectDocumentRefTargets({
			documents: documentsRes.data?.[0] ?? [],
			includeMeta: true,
		}),
		host: baseUrl,
	});
	if (refsRes.error) return refsRes;

	const documents = documentsFormatter.formatMultiple({
		documents: documentsRes.data?.[0] || [],
		collection: collectionRes.data,
		config: context.config,
		host: baseUrl,
		mediaOptions: {
			host: baseUrl,
			delivery: context.mediaDelivery,
			defaultLocale: context.config.localization.defaultLocale,
			locales: context.config.localization.locales,
		},
		hydratedRefs: refsRes.data.hydratedRefs,
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
			documents: afterFetchRes.data.documents,
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
			refs: refsRes.data.refs,
		},
	};
};

export default getMultiple;
