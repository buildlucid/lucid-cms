import type { LucidHookDocuments } from "@lucidcms/core/types";
import { REDIRECTS_COLLECTION_KEY } from "../../constants.js";
import type { RedirectsConfig } from "../../types/types.js";
import checkRedirectSource from "../redirects/check-redirect-source.js";
import checkRedirectUniqueness from "../redirects/check-redirect-uniqueness.js";
import getStoredRedirectIdentity from "../redirects/get-stored-redirect-identity.js";

/** Repeats the save checks against the destination, where other redirects and pages may differ. */
const redirectVersionPromoteHandler =
	(config: RedirectsConfig): LucidHookDocuments<"versionPromote">["handler"] =>
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== REDIRECTS_COLLECTION_KEY) {
			return { error: undefined, data: undefined };
		}

		const identityRes = await getStoredRedirectIdentity(context, {
			versionId: data.versionId,
			tables: meta.collectionTableNames,
			hasLocaleField: config.hasLocaleField,
			defaultLocale: config.defaultLocale,
		});
		if (identityRes.error) return identityRes;
		if (!identityRes.data) return { error: undefined, data: undefined };

		const uniqueRes = await checkRedirectUniqueness(context, {
			identity: identityRes.data,
			versionType: data.versionType,
			documentId: data.documentId,
			tables: meta.collectionTableNames,
			hasLocaleField: config.hasLocaleField,
		});
		if (uniqueRes.error) return uniqueRes;

		return checkRedirectSource(context, {
			config,
			identity: identityRes.data,
			versionType: data.versionType,
		});
	};

export default redirectVersionPromoteHandler;
