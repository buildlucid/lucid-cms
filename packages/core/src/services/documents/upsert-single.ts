import T from "../../translations/index.js";
import z from "zod";
import Repository from "../../libs/repositories/index.js";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidDocumentTableName } from "../../types.js";

const upsertSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			publish: boolean;

			documentId?: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
		},
	],
	number
> = async (context, data) => {
	const Document = Repository.get("documents", context.db, context.config.db);

	const documentTableRes = buildTableName<LucidDocumentTableName>("document", {
		collection: data.collectionKey,
	});
	if (documentTableRes.error) return documentTableRes;

	// ----------------------------------------------
	// Checks

	//* check collection exists
	const collectionRes =
		await context.services.collection.documents.checks.checkCollection(
			context,
			{
				key: data.collectionKey,
			},
		);
	if (collectionRes.error) return collectionRes;

	//* check collection is locked
	if (collectionRes.data.getData.config.isLocked) {
		return {
			error: {
				type: "basic",
				name: T("error_locked_collection_name"),
				message: T("error_locked_collection_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	//* check if document exists within the collection
	if (data.documentId !== undefined) {
		const existingDocumentRes = await Document.selectSingle(
			{
				select: ["id"],
				where: [
					{
						key: "id",
						operator: "=",
						value: data.documentId,
					},
					{
						key: "collection_key",
						operator: "=",
						value: data.collectionKey,
					},
				],
			},
			{
				tableName: documentTableRes.data,
			},
		);
		if (existingDocumentRes.error) return existingDocumentRes;

		if (existingDocumentRes.data === undefined) {
			return {
				error: {
					type: "basic",
					message: T("document_not_found_message"),
					status: 404,
				},
				data: undefined,
			};
		}
	}

	//* for single collections types, check if a document already exists
	const checkDocumentCountRes =
		await context.services.collection.documents.checks.checkSingleCollectionDocumentCount(
			context,
			{
				collectionKey: data.collectionKey,
				collectionMode: collectionRes.data.getData.mode,
				documentId: data.documentId,
				documentTable: documentTableRes.data,
			},
		);
	if (checkDocumentCountRes.error) return checkDocumentCountRes;

	// ----------------------------------------------
	// Upsert document

	// ----------------------------------------------
	// Create and manage document versions

	return {
		error: undefined,
		data: 1,
	};
};

export default upsertSingle;
