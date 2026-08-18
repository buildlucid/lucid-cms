import type { LucidHookDocuments } from "@lucidcms/core/types";
import { COLLECTION_KEY } from "../../constants.js";
import type { RedirectsPluginOptionsInternal } from "../../types.js";
import checkRedirectUniqueness from "../check-redirect-uniqueness.js";
import getRedirectIdentity from "../get-redirect-identity.js";

const versionPromoteHandler =
	(
		options: RedirectsPluginOptionsInternal,
	): LucidHookDocuments<"versionPromote">["handler"] =>
	async (context, payload) => {
		if (payload.meta.collectionKey !== COLLECTION_KEY) {
			return { error: undefined, data: undefined };
		}

		const identityRes = await getRedirectIdentity(context, {
			versionId: payload.data.versionId,
			tables: payload.meta.collectionTableNames,
			hasLocaleField: options.locales.length > 1,
			defaultLocale: options.defaultLocale,
		});
		if (identityRes.error) return identityRes;
		if (!identityRes.data) return { error: undefined, data: undefined };

		return checkRedirectUniqueness(context, {
			identity: identityRes.data,
			versionType: payload.data.versionType,
			documentId: payload.data.documentId,
			tables: payload.meta.collectionTableNames,
			hasLocaleField: options.locales.length > 1,
		});
	};

export default versionPromoteHandler;
