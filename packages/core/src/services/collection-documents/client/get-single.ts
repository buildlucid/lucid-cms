import T from "../../../translations/index.js";
import Repository from "../../../libs/repositories/index.js";
import Formatter from "../../../libs/formatters/index.js";
import { splitDocumentFilters } from "../../../utils/helpers/index.js";
import type z from "zod";
import type { ServiceFn } from "../../../utils/services/types.js";
import type collectionDocumentsSchema from "../../../schemas/collection-documents.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type { DocumentVersionType } from "../../../libs/db/types.js";

const getSingle: ServiceFn<
	[
		{
			collectionKey: string;
			status: Exclude<DocumentVersionType, "revision">;
			query: z.infer<typeof collectionDocumentsSchema.client.getSingle.query>;
		},
	],
	ClientDocumentResponse
> = async (context, data) => {
	const CollectionDocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
		context.config.db,
	);
	const CollectionDocumentsFormatter = Formatter.get("collection-documents");

	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const { documentFilters, documentFieldFilters } = splitDocumentFilters(
		collectionRes.data,
		data.query.filter,
	);

	const documentRes = await CollectionDocumentsRepo.selectSingleFiltered({
		documentFilters,
		documentFieldFilters,
		includeAllFields: true,
		includeGroups: data.query.include?.includes("bricks") !== true, //* if bricks are included we then that query will include groups - this is just to prevent querying the data twice
		collection: collectionRes.data,
		config: context.config,
		status: data.status,
		documentFieldsRelationStatus: data.status,
	});
	if (documentRes === undefined || documentRes.version_id === null) {
		return {
			error: {
				type: "basic",
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (data.query.include?.includes("bricks")) {
		const bricksRes =
			await context.services.collection.document.brick.getMultiple(context, {
				versionId: documentRes.version_id,
				collectionKey: collectionRes.data.key,
				documentFieldsRelationStatus: data.status,
			});
		if (bricksRes.error) return bricksRes;

		return {
			error: undefined,
			data: CollectionDocumentsFormatter.formatClientSingle({
				document: documentRes,
				collection: collectionRes.data,
				bricks: bricksRes.data.bricks,
				fields: bricksRes.data.fields,
				config: context.config,
			}),
		};
	}

	return {
		error: undefined,
		data: CollectionDocumentsFormatter.formatClientSingle({
			document: documentRes,
			collection: collectionRes.data,
			config: context.config,
		}),
	};
};

export default getSingle;
