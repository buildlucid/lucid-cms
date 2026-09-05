import type { CollectionDocument, Refs } from "../../../exports/types.js";
import collections from "../../../libs/collection/collections.js";
import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../../libs/db/tables/index.js";
import formatter, {
	documentsFormatter,
} from "../../../libs/formatters/index.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import { copy } from "../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../libs/permission/external-scopes.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ContentGetMultipleQueryParams } from "../../../schemas/documents.js";
import {
	applyDefaultQueryFilters,
	getBaseUrl,
	groupDocumentFilterConditions,
	groupDocumentFilters,
} from "../../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import authorizePreview from "../../preview-sessions/authorize.js";
import type { PreviewSessionCollectionTarget } from "../../preview-sessions/types.js";
import collectDocumentRefTargets from "../helpers/collect-document-ref-targets.js";
import resolveDocumentIncludes from "../helpers/resolve-document-includes.js";
import resolveDocumentRefs from "../helpers/resolve-document-refs.js";
import resolveRelationDocumentFilters from "../helpers/resolve-relation-document-filters.js";
import resolveRelationVersionType from "../helpers/resolve-relation-version-type.js";
import validateContentVersionTarget from "../helpers/validate-content-version-target.js";
import type { ContentDocumentVersionInput } from "./types.js";

type ContentDocumentsGetMultipleInput<TCollectionKey extends string = string> =
	{
		collectionKey: TCollectionKey;
		query: ContentGetMultipleQueryParams;
		externalScopes?: string[];
	} & ContentDocumentVersionInput<TCollectionKey>;

type ContentDocumentsGetMultipleResult<TCollectionKey extends string = string> =
	{
		documents: CollectionDocument<TCollectionKey>[];
		count: number;
		refs?: Refs;
	};

type ContentDocumentsGetMultipleService = <TCollectionKey extends string>(
	context: ServiceContext,
	data: ContentDocumentsGetMultipleInput<TCollectionKey>,
) => ServiceResponse<ContentDocumentsGetMultipleResult<TCollectionKey>>;

/** Fetches multiple content-facing documents with collection-aware response typing. */
const getMultiple: ContentDocumentsGetMultipleService = async <
	TCollectionKey extends string,
>(
	context: ServiceContext,
	data: ContentDocumentsGetMultipleInput<TCollectionKey>,
): ServiceResponse<ContentDocumentsGetMultipleResult<TCollectionKey>> => {
	const versionTargetRes = await validateContentVersionTarget({
		versionType: data.versionType,
		versionId: data.versionId,
	});
	if (versionTargetRes.error) return versionTargetRes;

	let versionType: DocumentVersionType = data.versionType;
	let versionId = versionTargetRes.data.versionId;
	let preview: PreviewSessionCollectionTarget | undefined;

	//* Preview tokens may override the explicit version for this collection.
	if (data.preview !== undefined) {
		const previewRes = await authorizePreview(context, {
			token: data.preview,
			collectionKey: data.collectionKey,
			versionType,
			versionId,
		});
		if (previewRes.error) return previewRes;
		//* Entry targets cannot enumerate the previewed collection; auxiliary targets can.
		if (
			previewRes.data.mode === "scoped" &&
			previewRes.data.target === "entry"
		) {
			return {
				error: {
					type: "forbidden",
					code: "preview_scope",
					message: copy("server:core.documents.preview.scoped.message"),
					status: 403,
				},
				data: undefined,
			};
		}
		preview = previewRes.data;
		versionType = preview.versionType;
		versionId = preview.versionId;
	}

	const [collectionRes, collectionsRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		collections.getAll(context, {}),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;

	//* work out allowed collection keys based on integration scopes
	let allowedCollectionKeys: string[] | undefined;
	if (data.externalScopes) {
		allowedCollectionKeys = collectionsRes.data
			.filter((collection) =>
				data.externalScopes?.includes(
					ExternalScopes.DocumentRead(collection.key),
				),
			)
			.map((collection) => collection.key);
	}

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

	const query: ContentGetMultipleQueryParams = {
		...data.query,
		filter: applyDefaultQueryFilters(data.query.filter, {
			isDeleted: {
				value: context.config.db.getDefault("boolean", "false"),
			},
		}),
	};
	const include = resolveDocumentIncludes(query.include);
	const [tableNameRes, relationVersionTypeRes] = await Promise.all([
		getTableNames(context, data.collectionKey),
		resolveRelationVersionType(context, {
			collectionKey: data.collectionKey,
			versionId,
			versionType,
		}),
	]);
	if (tableNameRes.error) return tableNameRes;
	if (relationVersionTypeRes.error) return relationVersionTypeRes;

	const relationFiltersRes = await resolveRelationDocumentFilters(context, {
		collection: collectionRes.data,
		bricksTableSchema: bricksTableSchemaRes.data,
		filter: query.filter,
		filterOr: query.filterOr,
		relationVersionType: relationVersionTypeRes.data.versionType,
		resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		allowedCollectionKeys,
	});
	if (relationFiltersRes.error) return relationFiltersRes;
	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		query.filter,
		{
			relationCollectionDefaults:
				relationFiltersRes.data.relationCollectionDefaults,
		},
	);

	const filterOr = query.filterOr?.map((group, index) => ({
		...groupDocumentFilterConditions(bricksTableSchemaRes.data, group, {
			relationCollectionDefaults:
				relationFiltersRes.data.relationCollectionDefaults,
		}),
		relationDocumentFilters: relationFiltersRes.data.filterOr[index] ?? [],
	}));

	const collectionFieldsTableSchemas = bricksTableSchemaRes.data.filter(
		(schema) => schema.key.brick === undefined,
	);
	const collectionFieldRelationTableSchemas =
		collectionFieldsTableSchemas.filter(
			(schema) => schema.type !== "document-fields",
		);

	const documentsRes = await Document.selectMultipleFiltered(
		{
			version: versionType,
			versionId,
			query,
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
			documentFieldRelationTableSchemas: collectionFieldRelationTableSchemas,
			includeWorkflow: false,
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const documentRows = documentsRes.data?.[0] ?? [];
	const baseUrl = getBaseUrl(context);

	const refsRes = await resolveDocumentRefs(context, {
		collection: collectionRes.data,
		collections: collectionsRes.data,
		brickSchema: collectionFieldsTableSchemas,
		responses: documentRows,
		versionType: relationVersionTypeRes.data.versionType,
		resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		refResources: include.refs,
		refTargets: collectDocumentRefTargets({
			documents: documentRows,
			includeMeta: include.meta,
		}),
		allowedDocumentCollectionKeys: allowedCollectionKeys,
		host: baseUrl,
		flattenRelationRefFields: true,
	});
	if (refsRes.error) return refsRes;

	const documents = documentsFormatter.formatMultiple({
		documents: documentRows,
		collection: collectionRes.data,
		config: context.config,
		host: baseUrl,
		mediaOptions: {
			host: baseUrl,
			delivery: context.mediaDelivery,
		},
		hydratedRefs: refsRes.data.hydratedRefs,
		hasFields: true,
		hasBricks: false,
		bricksTableSchema: collectionFieldsTableSchemas,
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
				versionType,
				relationVersionType: relationVersionTypeRes.data.versionType,
				documents,
			},
		},
	);
	if (afterFetchRes.error) return afterFetchRes;

	return {
		error: undefined,
		data: {
			documents: documentsFormatter.formatContentMultiple({
				documents: afterFetchRes.data.documents,
				collectionKey: data.collectionKey,
				collection: collectionRes.data,
				include: {
					bricks: false,
					meta: include.meta,
				},
			}),
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
			refs: refsRes.data.refs,
		},
	};
};

export default getMultiple;
