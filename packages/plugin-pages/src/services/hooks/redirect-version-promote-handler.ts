import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import { REDIRECTS_COLLECTION_KEY } from "../../constants.js";
import type { RedirectsConfig } from "../../types/types.js";
import checkRedirectSource from "../redirects/check-redirect-source.js";
import checkRedirectUniqueness from "../redirects/check-redirect-uniqueness.js";
import getStoredRedirectIdentity from "../redirects/get-stored-redirect-identity.js";

/** Repeats the save checks against the destination, where other redirects and pages may differ. */
const redirectVersionPromoteHandler =
	(
		config: RedirectsConfig,
	): LucidHookDocuments<"afterVersionPromote">["handler"] =>
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== REDIRECTS_COLLECTION_KEY) {
			return;
		}

		const identityRes = await getStoredRedirectIdentity(context, {
			versionId: data.versionId,
			tables: meta.collectionTableNames,
			hasLocaleField: config.hasLocaleField,
			defaultLocale: config.defaultLocale,
		});
		if (identityRes.error) throw new LucidError(identityRes.error);
		if (!identityRes.data) return;

		const uniqueRes = await checkRedirectUniqueness(context, {
			identity: identityRes.data,
			versionType: data.versionType,
			documentId: data.documentId,
			tables: meta.collectionTableNames,
			hasLocaleField: config.hasLocaleField,
		});
		if (uniqueRes.error) throw new LucidError(uniqueRes.error);

		const result = await checkRedirectSource(context, {
			config,
			identity: identityRes.data,
			versionType: data.versionType,
		});
		if (result.error) throw new LucidError(result.error);
		return;
	};

export default redirectVersionPromoteHandler;
