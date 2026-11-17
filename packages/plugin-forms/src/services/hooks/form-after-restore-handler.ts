import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import { FORMS_COLLECTION_KEY } from "../../constants.js";
import checkKeyUniqueness from "../forms/check-key-uniqueness.js";
import getStoredFormKeys from "../forms/get-stored-form-keys.js";

/**
 * Refuses to restore a form from the bin when another form took its key meanwhile, in latest or
 * an environment, so a key never reads two forms.
 */
const formAfterRestoreHandler: LucidHookDocuments<"afterRestore">["handler"] =
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== FORMS_COLLECTION_KEY || data.ids.length === 0) {
			return;
		}

		const keys = await getStoredFormKeys(context, {
			tables: meta.collectionTableNames,
			where: {
				documentIds: data.ids,
				versionTypes: [
					"latest",
					...meta.collection.getData.publishing.environments.map(
						(environment) => environment.key,
					),
				],
			},
		});
		if (keys.error) throw new LucidError(keys.error);

		for (const stored of keys.data) {
			const unique = await checkKeyUniqueness(context, {
				key: stored.key,
				versionType: stored.versionType,
				documentId: stored.documentId,
				tables: meta.collectionTableNames,
			});
			if (unique.error) throw new LucidError(unique.error);
		}
	};

export default formAfterRestoreHandler;
