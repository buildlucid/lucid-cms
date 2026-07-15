import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter, {
	documentsFormatter,
} from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ClientGetMultipleQueryParams } from "../../../schemas/documents.js";
import type {
	CollectionDocument,
	DocumentVersionType,
} from "../../../types.js";
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
import extractRelatedEntityIds from "../../documents-bricks/helpers/extract-related-entity-ids.js";
import fetchRefData, {
	type FieldRefResponse,
} from "../../documents-bricks/helpers/fetch-ref-data.js";
import { collectionServices } from "../../index.js";
import authorizePreview from "../../preview-sessions/authorize.js";
import type { PreviewSessionPerspectiveTarget } from "../../preview-sessions/types.js";
import resolveDocumentIncludes from "../helpers/resolve-document-includes.js";
import resolveRelationVersionType from "../helpers/resolve-relation-version-type.js";
import validateClientVersionTarget from "../helpers/validate-client-version-target.js";
import type { ClientDocumentTarget } from "./types.js";

type ClientDocumentsGetMultipleInput<TCollectionKey extends string = string> = {
	collectionKey: TCollectionKey;
	target: ClientDocumentTarget<TCollectionKey>;
	query: ClientGetMultipleQueryParams;
};

type ClientDocumentsGetMultipleResult<TCollectionKey extends string = string> =
	{
		data: CollectionDocument<TCollectionKey>[];
		count: number;
	};

type ClientDocumentsGetMultipleService = <TCollectionKey extends string>(
	context: ServiceContext,
	data: ClientDocumentsGetMultipleInput<TCollectionKey>,
) => ServiceResponse<ClientDocumentsGetMultipleResult<TCollectionKey>>;

/** Fetches multiple client-facing documents with collection-aware response typing. */
const getMultiple: ClientDocumentsGetMultipleService = async <
	TCollectionKey extends string,
>(
	context: ServiceContext,
	data: ClientDocumentsGetMultipleInput<TCollectionKey>,
): ServiceResponse<ClientDocumentsGetMultipleResult<TCollectionKey>> => {
	let versionType: DocumentVersionType;
	let versionId: number | undefined;
	let preview: PreviewSessionPerspectiveTarget | undefined;

	//* preview sessions resolve the effective version target
	if (data.target.type === "preview") {
		const previewRes = await authorizePreview(context, {
			token: data.target.token,
			collectionKey: data.collectionKey,
		});
		if (previewRes.error) return previewRes;
		//* exact previews only support single-document reads
		if (previewRes.data.mode === "exact") {
			return {
				error: {
					type: "forbidden",
					code: "preview_scope",
					message: copy("server:core.documents.preview.exact.message"),
					status: 403,
				},
				data: undefined,
			};
		}
		preview = previewRes.data;
		versionType = preview.versionType;
		versionId = undefined;
	} else {
		const versionTargetRes = await validateClientVersionTarget({
			versionType: data.target.versionType,
			versionId: data.target.versionId,
		});
		if (versionTargetRes.error) return versionTargetRes;
		versionType = data.target.versionType;
		versionId = versionTargetRes.data.versionId;
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

	const query: ClientGetMultipleQueryParams = {
		...data.query,
		filter: applyDefaultQueryFilters(data.query.filter, {
			isDeleted: {
				value: context.config.db.getDefault("boolean", "false"),
			},
		}),
	};
	const include = resolveDocumentIncludes(query.include);

	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		query.filter,
	);
	const filterOr = query.filterOr?.map((group) =>
		groupDocumentFilterConditions(bricksTableSchemaRes.data, group),
	);

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

	const relationVersionType = relationVersionTypeRes.data.versionType;
	const collectionFieldsTableSchemas = bricksTableSchemaRes.data.filter(
		(schema) => schema.key.brick === undefined,
	);
	const collectionFieldRelationTableSchemas =
		collectionFieldsTableSchemas.filter(
			(schema) => schema.type !== "document-fields",
		);

	const documentsRes = await Document.selectMultipleFiltered(
		{
			status: versionType,
			versionId,
			query,
			documentFilters,
			filterOr,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType,
			tables: {
				versions: tableNameRes.data.version,
				documentFields: tableNameRes.data.documentFields,
			},
			documentFieldsTableSchema: documentFieldsTableSchemaRes.data,
			documentFieldRelationTableSchemas: collectionFieldRelationTableSchemas,
			includeWorkflow: false,
			tenantKey: context.request.tenantKey,
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const documents = documentsRes.data?.[0] ?? [];
	const baseUrl = getBaseUrl(context);

	let refData: FieldRefResponse | undefined;
	if (include.refs) {
		const relationIdRes = await extractRelatedEntityIds(context, {
			collection: collectionRes.data,
			brickSchema: collectionFieldsTableSchemas,
			responses: documents,
			includeTypes: include.refTypes,
		});
		if (relationIdRes.error) return relationIdRes;

		const refDataRes = await fetchRefData(context, {
			values: relationIdRes.data,
			versionType: relationVersionType,
			resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		});
		if (refDataRes.error) return refDataRes;

		refData = refDataRes.data;
	}

	return {
		error: undefined,
		data: {
			data: documentsFormatter.formatClientMultiple<TCollectionKey>({
				documents,
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
				refData,
				refTypes: include.refTypes,
				hasFields: true,
				hasBricks: false,
				bricksTableSchema: collectionFieldsTableSchemas,
				include: {
					bricks: false,
					refs: include.refs,
					meta: include.meta,
				},
			}),
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
