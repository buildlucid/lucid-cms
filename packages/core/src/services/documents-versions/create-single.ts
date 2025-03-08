import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import merge from "lodash.merge";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { CollectionBuilder } from "../../builders.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidVersionTableName } from "../../types.js";

const createSingle: ServiceFn<
	[
		{
			documentId: number;
			collection: CollectionBuilder;
			userId: number;
			publish: boolean;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
		},
	],
	number
> = async (context, data) => {
	// Build document versions table name
	const versionsTableRes = buildTableName<LucidVersionTableName>("versions", {
		collection: data.collection.key,
	});
	if (versionsTableRes.error) return versionsTableRes;

	const DocumentVersions = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);

	const versionType = data.publish ? "published" : "draft";

	if (data.collection.getData.config.useRevisions) {
		//* make the current published|draft version a revision
		const updateRes = await DocumentVersions.updateSingle(
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
						value: versionType,
					},
				],
				data: {
					type: "revision",
					created_by: data.userId,
				},
			},
			{
				tableName: versionsTableRes.data,
			},
		);
		if (updateRes.error) return updateRes;
	} else {
		//* delete the current published|draft version
		const deleteRes = await DocumentVersions.deleteSingle(
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
						value: versionType,
					},
				],
			},
			{
				tableName: versionsTableRes.data,
			},
		);
		if (deleteRes.error) return deleteRes;
	}

	// Create new version (draft or published based on the publish value)
	const newVersionRes = await DocumentVersions.createSingle(
		{
			data: {
				collection_key: data.collection.key,
				document_id: data.documentId,
				type: versionType,
				created_by: data.userId,
				updated_by: data.userId,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		},
		{
			tableName: versionsTableRes.data,
		},
	);
	if (newVersionRes.error) return newVersionRes;

	// ----------------------------------------------
	// Fire beforeUpsert hook and merge result with data
	const hookResponse = await executeHooks(
		{
			service: "collection-documents",
			event: "beforeUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		context,
		{
			meta: {
				collectionKey: data.collection.key,
				userId: data.userId,
			},
			data: {
				documentId: data.documentId,
				versionId: newVersionRes.data.id,
				versionType: versionType,
				bricks: data.bricks,
				fields: data.fields,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	const bodyData = merge(data, hookResponse.data);

	// Save bricks for the new version

	console.log("save bricks", {
		versionId: newVersionRes.data.id,
		documentId: data.documentId,
		bricks: bodyData.bricks,
		fields: bodyData.fields,
		collection: data.collection,
	});
	// const createMultipleBricks =
	// 	await context.services.collection.document.brick.createMultiple(context, {
	// 		versionId: newVersion.data.id,
	// 		documentId: data.documentId,
	// 		bricks: bodyData.bricks,
	// 		fields: bodyData.fields,
	// 		collection: data.collection,
	// 	});

	// if (createMultipleBricks.error) return createMultipleBricks;

	// ----------------------------------------------
	// Fire afterUpsert hook
	const hookAfterRes = await executeHooks(
		{
			service: "collection-documents",
			event: "afterUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		context,
		{
			meta: {
				collectionKey: data.collection.key,
				userId: data.userId,
			},
			data: {
				documentId: data.documentId,
				versionId: newVersionRes.data.id,
				versionType: versionType,
				bricks: bodyData.bricks || [],
				fields: bodyData.fields || [],
			},
		},
	);
	if (hookAfterRes.error) return hookAfterRes;

	return {
		error: undefined,
		data: data.documentId,
	};
};

export default createSingle;
