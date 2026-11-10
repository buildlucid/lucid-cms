import { isDeepStrictEqual } from "node:util";
import type CollectionDefinition from "../../../../libs/collection/definitions/collection/index.js";
import filterReadableData from "../../../../libs/collection/field-access/filter-readable-data.js";
import getContentAccess from "../../../../libs/collection/field-access/get-content-access.js";
import type { DocumentData } from "../../../../libs/toolkit/documents/types.js";
import type { LucidActor } from "../../../../types/hono.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkValidateBricksFields from "../../../documents-bricks/checks/check-validate-bricks-fields.js";
import mergeDocumentData from "../../helpers/merge-document-data.js";
import readDocumentContent from "../../helpers/read-document-content.js";
import toDocumentInput from "../../helpers/to-document-input.js";

/**
 * Validates import values the way a save would, without saving, and reports whether they would change the document.
 * @remarks Content hooks don't run, as they may have side effects.
 */
const checkTransferData: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			data: DocumentData;
			authUser?: LucidActor;
			/** The document, or request proposal, the values would update. */
			current?: { id: number; versionId?: number };
		},
	],
	{ changed: boolean }
> = async (context, input) => {
	const access = getContentAccess(input.collection, input.authUser);
	const contentContext = {
		collection: input.collection,
		localization: context.config.localization,
		access,
	};

	const current = input.current
		? await readDocumentContent(context, {
				collectionKey: input.collection.key,
				id: input.current.id,
				versionId: input.current.versionId,
				allowWriteLock: true,
			})
		: undefined;
	if (current?.error) return current;

	const readable = current?.data
		? filterReadableData(
				input.collection,
				access,
				current.data.data,
				current.data.stored,
			)
		: undefined;
	const merged = mergeDocumentData(contentContext, input.data, readable);
	if (merged.error) return merged;
	if (readable && isDeepStrictEqual(merged.data, readable)) {
		return { error: undefined, data: { changed: false } };
	}

	const payload = toDocumentInput(
		contentContext,
		merged.data,
		current?.data?.stored,
	);
	if (payload.error) return payload;

	const checked = await checkValidateBricksFields(context, {
		collection: input.collection,
		bricks: payload.data.bricks,
		fields: payload.data.fields,
		authUser: input.authUser,
		existingVersion:
			input.current && current?.data
				? { id: current.data.version.id, documentId: input.current.id }
				: undefined,
	});
	if (checked.error) return checked;

	return { error: undefined, data: { changed: true } };
};

export default checkTransferData;
