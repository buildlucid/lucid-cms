import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type z from "zod";
import type { ServiceFn } from "../../utils/services/types.js";
import type collectionDocumentsSchema from "../../schemas/collection-documents.js";
import type { CollectionDocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: z.infer<typeof collectionDocumentsSchema.getSingle.query>;
		},
	],
	CollectionDocumentResponse
> = async (context, data) => {
	const DocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
		context.config.db,
	);
	const DocumentsFormatter = Formatter.get("collection-documents");

	const [document, collectionRes] = await Promise.all([
		DocumentsRepo.selectSingleById({
			id: data.id,
			collectionKey: data.collectionKey,
			config: context.config,
			status: data.status,
			versionId: data.versionId,
		}),
		context.services.collection.getSingleInstance(context, {
			key: data.collectionKey,
		}),
	]);

	if (document === undefined) {
		return {
			error: {
				type: "basic",
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}
	if (collectionRes.error) return collectionRes;

	// If given a status, but no version id is found, return 404
	if (data.status !== undefined && !document.version_id) {
		return {
			error: {
				type: "basic",
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const versionId =
		data.status !== undefined ? document.version_id : data.versionId;
	const versionType =
		data.status !== undefined ? data.status : document.version_type;

	if (!versionId || !versionType)
		return {
			error: {
				type: "basic",
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};

	if (data.query.include?.includes("bricks")) {
		const bricksRes =
			await context.services.collection.document.brick.getMultiple(context, {
				versionId: versionId,
				collectionKey: document.collection_key,
				documentFieldsRelationStatus:
					versionType !== "revision" ? versionType : undefined, // if we're fetching a revision, let it default to the draft version
			});
		if (bricksRes.error) return bricksRes;

		return {
			error: undefined,
			data: DocumentsFormatter.formatSingle({
				document: document,
				collection: collectionRes.data,
				bricks: bricksRes.data.bricks,
				fields: bricksRes.data.fields,
				config: context.config,
			}),
		};
	}

	return {
		error: undefined,
		data: DocumentsFormatter.formatSingle({
			document: document,
			collection: collectionRes.data,
			bricks: [],
			fields: [],
			config: context.config,
		}),
	};
};

export default getSingle;
