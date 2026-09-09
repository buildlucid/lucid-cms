import type { LucidHookDocuments } from "@lucidcms/core/types";
import { COLLECTION_KEY } from "../../constants.js";
import type { RedirectsPluginOptionsInternal } from "../../types.js";
import checkRedirectUniqueness from "../check-redirect-uniqueness.js";
import getRedirectIdentity from "../get-redirect-identity.js";

const versionPromoteHandler =
	(
		options: RedirectsPluginOptionsInternal,
	): LucidHookDocuments<"versionPromote">["handler"] =>
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== COLLECTION_KEY) {
			return { error: undefined, data: undefined };
		}

		const identityRes = await getRedirectIdentity(context, {
			versionId: data.versionId,
			tables: meta.collectionTableNames,
			hasLocaleField: options.locales.length > 1,
			defaultLocale: options.defaultLocale,
		});
		if (identityRes.error) return identityRes;
		if (!identityRes.data) return { error: undefined, data: undefined };

		return checkRedirectUniqueness(context, {
			identity: identityRes.data,
			versionType: data.versionType,
			documentId: data.documentId,
			tables: meta.collectionTableNames,
			hasLocaleField: options.locales.length > 1,
		});
	};

export default versionPromoteHandler;
