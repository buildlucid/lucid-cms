import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";

import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { BooleanInt } from "../../libs/db/types.js";

const upsertSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			publish: BooleanInt;

			documentId?: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
		},
	],
	number
> = async (context, data) => {
	const CollectionDocumentsRepo = Repository.get(
		"collection-documents",
		context.db,
	);

	// ----------------------------------------------

	// Check collection exists
	const collectionRes =
		await context.services.collection.document.checks.checkCollection(context, {
			key: data.collectionKey,
		});
	if (collectionRes.error) return collectionRes;

	// Check collection is locked
	if (collectionRes.data.config.isLocked === true) {
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

	// Check if document exists within the collection
	if (data.documentId !== undefined) {
		const existingDocument = await CollectionDocumentsRepo.selectSingle({
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
		});

		if (existingDocument === undefined) {
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

	// Check if a single document already exists for this collection
	const checkDocumentCount =
		await context.services.collection.document.checks.checkSingleCollectionDocumentCount(
			context,
			{
				collectionKey: data.collectionKey,
				collectionMode: collectionRes.data.data.mode,
				documentId: data.documentId,
			},
		);
	if (checkDocumentCount.error) return checkDocumentCount;

	// ----------------------------------------------
	// Upsert document
	const document = await CollectionDocumentsRepo.upsertSingle({
		id: data.documentId,
		collectionKey: data.collectionKey,
		createdBy: data.userId,
		updatedBy: data.userId,
		isDeleted: 0,
		updatedAt: new Date().toISOString(),
	});
	if (document === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

	// ----------------------------------------------
	// Create and manage document versions
	const createVersionRes =
		await context.services.collection.document.versions.createSingle(context, {
			documentId: document.id,
			userId: data.userId,
			publish: data.publish,
			bricks: data.bricks,
			fields: data.fields,
			collection: collectionRes.data,
		});
	if (createVersionRes.error) return createVersionRes;

	return {
		error: undefined,
		data: document.id,
	};
};

export default upsertSingle;
