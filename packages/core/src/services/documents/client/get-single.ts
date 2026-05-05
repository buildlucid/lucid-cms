import constants from "../../../constants/constants.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { documentsFormatter } from "../../../libs/formatters/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ClientGetSingleQueryParams } from "../../../schemas/documents.js";
import T from "../../../translations/index.js";
import type {
	CollectionDocument,
	CollectionDocumentStatus,
} from "../../../types.js";
import {
	applyDefaultQueryFilters,
	groupDocumentFilters,
} from "../../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { collectionServices, documentBrickServices } from "../../index.js";

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
		data.status ===
		constants.collectionBuilder.publishRequests.snapshotVersionType
	) {
		return {
			error: {
				message: T("document_not_found_message"),
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

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const query: ClientGetSingleQueryParams = {
		...data.query,
		filter: applyDefaultQueryFilters(data.query.filter, {
			isDeleted: { value: "false" },
		}),
	};

	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		query.filter,
	);

	const documentRes = await Documents.selectSingleFiltered(
		{
			status: data.status,
			query,
			documentFilters,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: data.status,
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
				message: T("document_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const bricksRes = await documentBrickServices.getMultiple(context, {
		versionId: documentRes.data.version_id,
		collectionKey: collectionRes.data.key,
		versionType: data.status,
		documentFieldsOnly: !query.include?.includes("bricks"),
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
		}),
	};
};

export default getSingle;
