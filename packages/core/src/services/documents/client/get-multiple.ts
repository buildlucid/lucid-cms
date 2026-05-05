import constants from "../../../constants/constants.js";
import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter, {
	documentsFormatter,
} from "../../../libs/formatters/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ClientGetMultipleQueryParams } from "../../../schemas/documents.js";
import T from "../../../translations/index.js";
import type {
	CollectionDocument,
	CollectionDocumentStatus,
} from "../../../types.js";
import {
	applyDefaultQueryFilters,
	getBaseUrl,
	groupDocumentFilters,
} from "../../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import extractRelatedEntityIds from "../../documents-bricks/helpers/extract-related-entity-ids.js";
import fetchRefData from "../../documents-bricks/helpers/fetch-ref-data.js";
import { collectionServices } from "../../index.js";

type ClientDocumentsGetMultipleInput<TCollectionKey extends string = string> = {
	collectionKey: TCollectionKey;
	status: CollectionDocumentStatus<TCollectionKey>;
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
			isDeleted: { value: "false" },
		}),
	};

	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		query.filter,
	);

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const documentsRes = await Document.selectMultipleFiltered(
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
				documentFields: tableNameRes.data.documentFields,
			},
			documentFieldsTableSchema: documentFieldsTableSchemaRes.data,
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const relationIdRes = await extractRelatedEntityIds(context, {
		collection: collectionRes.data,
		brickSchema: bricksTableSchemaRes.data,
		responses: documentsRes.data?.[0] ?? [],
	});
	if (relationIdRes.error) return relationIdRes;

	const refDataRes = await fetchRefData(context, {
		values: relationIdRes.data,
		versionType: data.status,
	});
	if (refDataRes.error) return refDataRes;

	return {
		error: undefined,
		data: {
			data: documentsFormatter.formatClientMultiple<TCollectionKey>({
				documents: documentsRes.data?.[0] || [],
				collection: collectionRes.data,
				config: context.config,
				host: getBaseUrl(context),
				refData: refDataRes.data,
				hasFields: true,
				hasBricks: false,
				bricksTableSchema: bricksTableSchemaRes.data,
			}),
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
