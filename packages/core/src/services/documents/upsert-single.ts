import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import { getTableNames } from "../../libs/collection/schema/database/schema-filters.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";

const upsertSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			publish: boolean;

			documentId?: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	number
> = async (context, data) => {
	const Document = Repository.get("documents", context.db, context.config.db);

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

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

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
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: tableNamesRes.data.document,
			},
		);
		if (existingDocumentRes.error) return existingDocumentRes;
	}

	//* for single collections types, check if a document already exists
	const checkDocumentCountRes =
		await context.services.collection.documents.checks.checkSingleCollectionDocumentCount(
			context,
			{
				collectionKey: data.collectionKey,
				collectionMode: collectionRes.data.getData.mode,
				documentId: data.documentId,
				documentTable: tableNamesRes.data.document,
			},
		);
	if (checkDocumentCountRes.error) return checkDocumentCountRes;

	// ----------------------------------------------
	// Upsert document
	const upsertDocRes = await Document.upsertSingle(
		{
			data: {
				id: data.documentId,
				collection_key: data.collectionKey,
				created_by: data.userId,
				updated_by: data.userId,
				is_deleted: false,
				updated_at: new Date().toISOString(),
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (upsertDocRes.error) return upsertDocRes;

	// ----------------------------------------------
	// Create and manage document versions
	const createVersionRes =
		await context.services.collection.documentVersions.createSingle(context, {
			documentId: upsertDocRes.data.id,
			userId: data.userId,
			publish: data.publish,
			bricks: data.bricks,
			fields: data.fields,
			collection: collectionRes.data,
		});
	if (createVersionRes.error) return createVersionRes;

	return {
		error: undefined,
		data: upsertDocRes.data.id,
	};
};

export default upsertSingle;
