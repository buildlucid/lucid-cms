import Repository from "../../libs/repositories/index.js";
import executeHooks from "../../utils/hooks/execute-hooks.js";
import merge from "lodash.merge";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { CollectionBuilder } from "../../builders.js";
import type { ServiceFn } from "../../utils/services/types.js";

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
	const VersionsRepo = Repository.get(
		"collection-document-versions",
		context.db,
		context.config.db,
	);
	const versionType = data.publish ? "published" : "draft";

	if (data.collection.getData.config.useRevisions) {
		await VersionsRepo.updateSingle({
			where: [
				{
					key: "document_id",
					operator: "=",
					value: data.documentId,
				},
				{
					key: "version_type",
					operator: "=",
					value: versionType,
				},
			],
			data: {
				version_type: "revision",
				created_by: data.userId,
			},
		});
	} else {
		await VersionsRepo.deleteSingle({
			where: [
				{
					key: "document_id",
					operator: "=",
					value: data.documentId,
				},
				{
					key: "version_type",
					operator: "=",
					value: versionType,
				},
			],
		});
	}

	// Create new version (draft or published based on the publish value)
	const newVersion = await VersionsRepo.createSingle({
		document_id: data.documentId,
		version_type: versionType,
		created_by: data.userId,
	});

	if (newVersion === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
			},
			data: undefined,
		};
	}

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
				collection: data.collection,
				collectionKey: data.collection.key,
				userId: data.userId,
			},
			data: {
				documentId: data.documentId,
				versionId: newVersion.id,
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
		await context.services.collection.document.brick.createMultiple(context, {
			versionId: newVersion.id,
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
			service: "collection-documents",
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
				versionId: newVersion.id,
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
