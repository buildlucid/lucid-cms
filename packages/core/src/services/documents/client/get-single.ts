import constants from "../../../constants/constants.js";
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
	CollectionDocumentStatus,
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
import resolveDocumentIncludes from "../helpers/resolve-document-includes.js";
import resolveRelationVersionType from "../helpers/resolve-relation-version-type.js";

type ClientDocumentsGetSingleInput<TCollectionKey extends string = string> = {
	collectionKey: TCollectionKey;
	status: CollectionDocumentStatus<TCollectionKey>;
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
	if (
		data.status === constants.collectionBuilder.publishing.snapshotVersionType
	) {
		return {
			error: {
				message: copy("server:core.documents.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
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

	const [tableNameRes, relationVersionTypeRes] = await Promise.all([
		getTableNames(context, data.collectionKey),
		resolveRelationVersionType(context, {
			collectionKey: data.collectionKey,
			versionType: data.status,
		}),
	]);
	if (tableNameRes.error) return tableNameRes;
	if (relationVersionTypeRes.error) return relationVersionTypeRes;

	const query: ClientGetSingleQueryParams = {
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

	const documentRes = await Documents.selectSingleFiltered(
		{
			status: data.status,
			query,
			documentFilters,
			filterOr,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: relationVersionTypeRes.data.versionType,
			tenantKey: context.request.tenantKey,
			tables: {
				versions: tableNameRes.data.version,
			},
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	if (documentRes.data === undefined || !documentRes.data.version_id) {
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
