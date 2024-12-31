import Repository from "../../libs/repositories/index.js";
import formatInsertBricks from "./helpers/format-insert-bricks.js";
import formatPostInsertBricks from "./helpers/format-post-insert-bricks.js";
import formatInsertFields from "./helpers/format-insert-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";

const createMultiple: ServiceFn<
	[
		{
			versionId: number;
			documentId: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
			collection: CollectionBuilder;
			skipValidation?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const BricksRepo = Repository.get(
		"collection-document-bricks",
		context.db,
		context.config.db,
	);

	// -------------------------------------------------------------------------------
	// set bricks
	const bricks = formatInsertBricks({
		bricks: data.bricks,
		fields: data.fields,
		localisation: context.config.localisation,
		collection: data.collection,
	});
	if (bricks.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	// -------------------------------------------------------------------------------
	// validation
	if (data.skipValidation !== true) {
		const checkBrickOrder =
			context.services.collection.document.brick.checks.checkDuplicateOrder(
				bricks,
			);
		if (checkBrickOrder.error) return checkBrickOrder;

		const checkValidateBricksFields =
			await context.services.collection.document.brick.checks.checkValidateBricksFields(
				context,
				{
					collection: data.collection,
					bricks: bricks,
				},
			);
		if (checkValidateBricksFields.error) return checkValidateBricksFields;
	}

	// -------------------------------------------------------------------------------
	// insert bricks
	const bricksRes = await BricksRepo.createMultiple({
		items: bricks.map((b) => ({
			brickType: b.type,
			brickKey: b.key,
			brickOrder: b.order,
			brickOpen: b.open,
			collectionDocumentVersionId: data.versionId,
		})),
	});

	const postInsertBricks = formatPostInsertBricks(bricks, bricksRes);

	// -------------------------------------------------------------------------------
	// create groups
	const groups =
		await context.services.collection.document.brick.createMultipleGroups(
			context,
			{
				versionId: data.versionId,
				documentId: data.documentId,
				brickGroups: postInsertBricks.map((b) => ({
					brickId: b.id,
					groups: b.groups,
				})),
			},
		);
	if (groups.error) return groups;

	// -------------------------------------------------------------------------------
	// create fields
	const fields =
		await context.services.collection.document.brick.createMultipleFields(
			context,
			{
				versionId: data.versionId,
				documentId: data.documentId,
				fields: postInsertBricks.flatMap((b) =>
					formatInsertFields({
						groups: groups.data,
						brick: b,
						collection: data.collection,
					}),
				),
			},
		);
	if (fields.error) return fields;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
