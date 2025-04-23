import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import merge from "lodash.merge";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { CollectionBuilder } from "../../builders.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
	[
		{
			documentId: number;
			collection: CollectionBuilder;
			userId: number;
			publish: boolean;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	number
> = async (context, data) => {
	const tableNameRes = data.collection.tableNames;
	if (tableNameRes.error) return tableNameRes;

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
				tableName: tableNameRes.data.version,
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
				tableName: tableNameRes.data.version,
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
			tableName: tableNameRes.data.version,
		},
	);
	if (newVersionRes.error) return newVersionRes;

	// ----------------------------------------------
	// Fire beforeUpsert hook and merge result with data
	const hookResponse = await executeHooks(
		{
			service: "documents",
			event: "beforeUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		context,
		{
			meta: {
				collection: data.collection,
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
	const createMultipleBricks =
		await context.services.collection.documentBricks.createMultiple(context, {
			versionId: newVersionRes.data.id,
			documentId: data.documentId,
			bricks: bodyData.bricks,
			fields: bodyData.fields,
			collection: data.collection,
		});
	if (createMultipleBricks.error) return createMultipleBricks;

	// ----------------------------------------------
	// Fire afterUpsert hook
	const hookAfterRes = await executeHooks(
		{
			service: "documents",
			event: "afterUpsert",
			config: context.config,
			collectionInstance: data.collection,
		},
		context,
		{
			meta: {
				collection: data.collection,
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
