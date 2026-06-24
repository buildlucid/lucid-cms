import executeHooks from "../../libs/hooks/execute-hooks.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { documentBrickServices } from "../index.js";
import filterChangedDraftFields from "./helpers/filter-changed-fields.js";
import getUpdateContext from "./helpers/get-update-context.js";

const checkSingle: ServiceFn<
	[
		{
			collectionKey: string;
			userId: number;
			documentId: number;
			versionId: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
		},
	],
	{
		bricks: Array<BrickInputSchema>;
		fields: Array<FieldInputSchema>;
	}
> = async (context, data) => {
	const updateContextRes = await getUpdateContext(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (updateContextRes.error) return updateContextRes;

	const hookResponse = await executeHooks(
		context,
		{
			service: "documents",
			event: "beforeUpsert",
			config: context.config,
			collectionInstance: updateContextRes.data.collection,
		},
		{
			meta: {
				collection: updateContextRes.data.collection,
				collectionKey: data.collectionKey,
				userId: data.userId,
				collectionTableNames: updateContextRes.data.tableNames,
				tenantKey: context.request.tenantKey ?? null,
				execution: {
					mode: "check",
					action: "update",
					willPersist: false,
				},
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: updateContextRes.data.versionType,
				bricks: data.bricks,
				fields: data.fields,
			},
		},
	);
	if (hookResponse.error) return hookResponse;

	const bricks = hookResponse.data.bricks ?? [];
	const fields = hookResponse.data.fields ?? [];

	const checkBrickOrderRes =
		documentBrickServices.checks.checkDuplicateOrder(bricks);
	if (checkBrickOrderRes.error) return checkBrickOrderRes;

	const checkValidateRes =
		await documentBrickServices.checks.checkValidateBricksFields(context, {
			collection: updateContextRes.data.collection,
			bricks,
			fields,
		});
	if (checkValidateRes.error) return checkValidateRes;

	return {
		error: undefined,
		data: filterChangedDraftFields({
			originalBricks: data.bricks,
			originalFields: data.fields,
			transformedBricks: bricks,
			transformedFields: fields,
		}),
	};
};

export default checkSingle;
