import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkDuplicateOrder from "../../documents-bricks/checks/check-duplicate-order.js";
import checkValidateBricksFields from "../../documents-bricks/checks/check-validate-bricks-fields.js";
import readVersionContent from "./read-version-content.js";

/** Checks that a saved version would pass field validation before it is published. */
const validateVersionContent: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			documentId: number;
			versionId: number;
			user?: LucidUser;
		},
	],
	undefined
> = async (context, data) => {
	const versionRes = await readVersionContent(context, {
		collectionKey: data.collection.key,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (versionRes.error) return versionRes;

	if (!versionRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const content = versionRes.data.content;
	const orderRes = checkDuplicateOrder(content.bricks);
	if (orderRes.error) return orderRes;

	return checkValidateBricksFields(context, {
		collection: data.collection,
		bricks: content.bricks,
		fields: content.fields,
		authUser: data.user,
		existingVersion: { id: data.versionId, documentId: data.documentId },
	});
};

export default validateVersionContent;
