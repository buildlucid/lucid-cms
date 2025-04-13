import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type {
	CollectionDocumentResponse,
	FieldResponse,
	BrickResponse,
} from "../../types.js";
import { inspect } from "node:util";

// @ts-expect-error
const promoteVersion: ServiceFn<
	[
		{
			fromVersionId: number;
			toVersionType: "draft" | "published";
			collectionKey: string;
			documentId: number;
			userId: number;
			skipRevisionCheck?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Versions = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);
	const Documents = Repository.get("documents", context.db, context.config.db);
	const DocumentBricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);

	// -------------------------------------------------------------------------------
	// Initial data fetch and error checking
	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const versionTableName = collectionRes.data.documentVersionTableSchema?.name;
	const documentTableName = collectionRes.data.documentTableSchema?.name;

	if (!versionTableName || !documentTableName) {
		return {
			error: {
				message: T("error_getting_collection_names"),
				status: 500,
			},
			data: undefined,
		};
	}

	const [versionRes, bricksRawRes] = await Promise.all([
		Versions.selectSingle(
			{
				select: ["id", "type", "document_id"],
				where: [
					{
						key: "id",
						operator: "=",
						value: data.fromVersionId,
					},
				],
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_version_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: versionTableName,
			},
		),
		// Documents.selectSingleById(
		// 	{
		// 		id: data.documentId,
		// 		tables: {
		// 			versions: versionTableName,
		// 		},
		// 		versionId: data.fromVersionId,
		// 		validation: {
		// 			enabled: true,
		// 			defaultError: {
		// 				message: T("document_version_not_found_message"),
		// 				status: 404,
		// 			},
		// 		},
		// 	},
		// 	{
		// 		tableName: documentTableName,
		// 	},
		// ),
		DocumentBricks.selectMultipleByVersionId(
			{
				versionId: data.fromVersionId,
				documentId: data.documentId,
				bricksSchema: collectionRes.data.bricksTableSchema,
			},
			{
				tableName: versionTableName,
			},
		),
	]);
	if (versionRes.error) return versionRes;
	// if (documentRawRes.error) return documentRawRes;
	if (bricksRawRes.error) return bricksRawRes;

	// Additional error checks
	if (versionRes.data.document_id !== data.documentId) {
		return {
			error: {
				type: "basic",
				message: T("document_version_doesnt_belong_to_document"),
				status: 404,
			},
			data: undefined,
		};
	}
	if (versionRes.data.type === data.toVersionType) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_promote_to_same_version_message"),
			},
			data: undefined,
		};
	}
	if (versionRes.data.type === "revision" && data.skipRevisionCheck !== true) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_promote_revision_message"),
			},
			data: undefined,
		};
	}
	if (
		collectionRes.data.getData.config.useDrafts !== true &&
		data.toVersionType === "draft"
	) {
		return {
			error: {
				type: "basic",
				message: T("cannot_promote_to_draft_message"),
				status: 400,
			},
			data: undefined,
		};
	}
	if (collectionRes.data.getData.config.isLocked === true) {
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

	//-------------------------------------------------------------------------------
	// Mutate/create revisions and update the document
	const [, upsertDocumentRes, createVersionRes] = await Promise.all([
		collectionRes.data.getData.config.useRevisions
			? Versions.updateSingle(
					{
						where: [
							{
								key: "document_id",
								operator: "=",
								value: data.documentId,
							},
							{
								key: "type",
								operator: "=",
								value: data.toVersionType,
							},
						],
						data: {
							type: "revision",
							promoted_from: data.fromVersionId,
							created_by: data.userId,
						},
					},
					{
						tableName: versionTableName,
					},
				)
			: Versions.deleteSingle(
					{
						where: [
							{
								key: "document_id",
								operator: "=",
								value: data.documentId,
							},
							{
								key: "type",
								operator: "=",
								value: data.toVersionType,
							},
						],
					},
					{
						tableName: versionTableName,
					},
				),
		Documents.upsertSingle(
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
					defaultError: {
						status: 400,
						message: T("failed_to_create_document_or_version"),
					},
				},
			},
			{
				tableName: documentTableName,
			},
		),
		Versions.createSingle(
			{
				data: {
					document_id: data.documentId,
					collection_key: data.collectionKey,
					type: data.toVersionType,
					promoted_from: data.fromVersionId,
					created_by: data.userId,
					updated_by: data.userId,
				},
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						status: 400,
						message: T("failed_to_create_document_or_version"),
					},
				},
			},
			{
				tableName: versionTableName,
			},
		),
	]);
	if (upsertDocumentRes.error) return upsertDocumentRes;
	if (createVersionRes.error) return createVersionRes;

	// -------------------------------------------------------------------------------
	// Create new brick tale rows for the new version

	/*
     - Based on the bricks schema, get the brick tables from the bricksRawRes response
     - Update all version ID references with the new one
     - Group the tables by priority, document-fields and bricks top level, then repeaters at an incremented priority 1-to-1 with how nested they are
     - Insert the brick tables
     */

	console.log(
		"TARGET VERSION",
		inspect(versionRes.data, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	console.log(
		"BRICKS QUERY RESPONSE",
		inspect(bricksRawRes.data, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	console.log(
		"UPSERT DOCUMENT",
		inspect(upsertDocumentRes.data, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	console.log(
		"CREATE VERSION",
		inspect(createVersionRes.data, {
			depth: Number.POSITIVE_INFINITY,
			colors: true,
			numericSeparator: true,
		}),
	);

	throw new Error("Testing so the transaction rollsback");

	// -------------------------------------------------------------------------------
	// Execute hook

	// biome-ignore lint/correctness/noUnreachable: testing
	const hookResponse = await executeHooks(
		{
			service: "collection-documents",
			event: "versionPromote",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		context,
		{
			meta: {
				collectionKey: data.collectionKey,
				userId: data.userId,
			},
			data: {
				documentId: data.documentId,
				// TODO: remove comment bellow after test throw has been removed
				// @ts-expect-error
				versionId: createVersionRes.data.id,
				versionType: data.toVersionType,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	// -------------------------------------------------------------------------------
	// Success
	return {
		error: undefined,
		data: undefined,
	};
};

export default promoteVersion;
