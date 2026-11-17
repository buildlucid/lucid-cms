import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import { FORMS_COLLECTION_KEY } from "../../constants.js";
import checkKeyUniqueness from "../forms/check-key-uniqueness.js";
import getStoredFormKeys from "../forms/get-stored-form-keys.js";

/**
 * Repeats the save's key check where a form is published, as another form may already own the key
 * there even though it doesn't in latest.
 */
const formVersionPromoteHandler: LucidHookDocuments<"afterVersionPromote">["handler"] =
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== FORMS_COLLECTION_KEY) return;

		const keys = await getStoredFormKeys(context, {
			tables: meta.collectionTableNames,
			where: { versionId: data.versionId },
		});
		if (keys.error) throw new LucidError(keys.error);

		for (const stored of keys.data) {
			const unique = await checkKeyUniqueness(context, {
				key: stored.key,
				versionType: data.versionType,
				documentId: data.documentId,
				tables: meta.collectionTableNames,
			});
			if (unique.error) throw new LucidError(unique.error);
		}
	};

export default formVersionPromoteHandler;
