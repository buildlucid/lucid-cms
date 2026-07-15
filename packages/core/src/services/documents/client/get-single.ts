import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentsFormatter } from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ClientGetSingleQueryParams } from "../../../schemas/documents.js";
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
import { collectionServices, documentBrickServices } from "../../index.js";
import authorizePreview from "../../preview-sessions/authorize.js";
import type { PreviewSessionDocumentTarget } from "../../preview-sessions/types.js";
import resolveDocumentIncludes from "../helpers/resolve-document-includes.js";
import resolveRelationVersionType from "../helpers/resolve-relation-version-type.js";
import validateClientVersionTarget from "../helpers/validate-client-version-target.js";
import type { ClientDocumentTarget } from "./types.js";

type ClientDocumentsGetSingleInput<TCollectionKey extends string = string> = {
	collectionKey: TCollectionKey;
	target: ClientDocumentTarget<TCollectionKey>;
	query: ClientGetSingleQueryParams;
};

type ClientDocumentsGetSingleService = <TCollectionKey extends string>(
	context: ServiceContext,
	data: ClientDocumentsGetSingleInput<TCollectionKey>,
) => ServiceResponse<CollectionDocument<TCollectionKey>>;

/** Fetches one client-facing document with a response type tied to the collection key. */
const getSingle: ClientDocumentsGetSingleService = async <
	TCollectionKey extends string,
>(
	context: ServiceContext,
	data: ClientDocumentsGetSingleInput<TCollectionKey>,
): ServiceResponse<CollectionDocument<TCollectionKey>> => {
	let versionType: DocumentVersionType | undefined;
	let versionId: number | undefined;
	let preview: PreviewSessionDocumentTarget | undefined;

	//* preview sessions resolve the effective version target
	if (data.target.type === "preview") {
		const previewRes = await authorizePreview(context, {
			token: data.target.token,
			collectionKey: data.collectionKey,
		});
		if (previewRes.error) return previewRes;
		preview = previewRes.data;
		//* exact previews pin both the entry document and version
		versionType =
			preview.mode === "exact"
				? preview.entry.versionType
				: preview.versionType;
		versionId = preview.mode === "exact" ? preview.entry.versionId : undefined;
	} else {
		const versionTargetRes = await validateClientVersionTarget({
			versionType: data.target.versionType,
			versionId: data.target.versionId,
		});
		if (versionTargetRes.error) return versionTargetRes;
		versionType = data.target.versionType;
		versionId = versionTargetRes.data.versionId;
	}

	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const collectionRes = collectionServices.getSingleInstance(context, {
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

	const query: ClientGetSingleQueryParams = {
		...data.query,
		filter: {
			...applyDefaultQueryFilters(data.query.filter, {
				isDeleted: {
					value: context.config.db.getDefault("boolean", "false"),
				},
			}),
			...(preview?.mode === "exact"
				? { id: { value: preview.entry.documentId } }
				: {}),
		},
	};
	const include = resolveDocumentIncludes(query.include);
	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		query.filter,
	);
	const filterOr = query.filterOr?.map((group) =>
		groupDocumentFilterConditions(bricksTableSchemaRes.data, group),
	);

	const relationVersionTypeRes = await resolveRelationVersionType(context, {
		collectionKey: data.collectionKey,
		documentId:
			preview?.mode === "exact" ? preview.entry.documentId : undefined,
		versionId,
		versionType: versionType ?? "latest",
	});
	if (relationVersionTypeRes.error) return relationVersionTypeRes;

	const documentRes = await Documents.selectSingleFiltered(
		{
			status: versionType ?? "latest",
			versionId,
			query,
			documentFilters,
			filterOr,
			brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: relationVersionTypeRes.data.versionType,
			tenantKey: context.request.tenantKey,
			tables: { versions: tableNameRes.data.version },
		},
		{ tableName: tableNameRes.data.document },
	);
	if (documentRes.error) return documentRes;
	if (!documentRes.data?.version_id) {
		return {
			error: {
				message: copy("server:core.documents.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const bricksRes = await documentBrickServices.getMultiple(context, {
		versionId: documentRes.data.version_id,
		collectionKey: collectionRes.data.key,
		versionType: relationVersionTypeRes.data.versionType,
		resolveVersionType: relationVersionTypeRes.data.resolveVersionType,
		includeBricks: include.bricks,
		includeRefs: include.refs,
		refTypes: include.refTypes,
		flattenRelationRefFields: true,
	});
	if (bricksRes.error) return bricksRes;

	return {
		error: undefined,
		data: documentsFormatter.formatClientSingle<TCollectionKey>({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: bricksRes.data.bricks,
			fields: bricksRes.data.fields,
			config: context.config,
			refs: bricksRes.data.refs,
			host: getBaseUrl(context),
			include: {
				bricks: include.bricks,
				refs: include.refs,
				meta: include.meta,
			},
		}),
	};
};

export default getSingle;
