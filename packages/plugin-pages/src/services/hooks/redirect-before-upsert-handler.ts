import { copy } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import { REDIRECTS_COLLECTION_KEY, redirectFields } from "../../constants.js";
import type { RedirectsConfig } from "../../types/types.js";
import getRedirectIdentity from "../../utils/get-redirect-identity.js";
import isDirectSelfRedirect from "../../utils/is-direct-self-redirect.js";
import normalizeRedirectPath from "../../utils/normalize-redirect-path.js";
import checkRedirectSource from "../redirects/check-redirect-source.js";
import checkRedirectUniqueness from "../redirects/check-redirect-uniqueness.js";

/**
 * Stores a redirect's source path the way page paths are stored, then rejects redirects to
 * themselves, sources another redirect owns and sources a page uses.
 */
const redirectBeforeUpsertHandler =
	(config: RedirectsConfig): LucidHookDocuments<"beforeUpsert">["handler"] =>
	async ({ context, data, meta }) => {
		if (meta.collectionKey !== REDIRECTS_COLLECTION_KEY) {
			return { error: undefined, data: undefined };
		}

		const fromField = data.fields?.find(
			(field) => field.key === redirectFields.from,
		);
		if (fromField && typeof fromField.value === "string") {
			fromField.value = normalizeRedirectPath(fromField.value);
		}

		const identity = getRedirectIdentity({
			fields: data.fields,
			defaultLocale: config.defaultLocale,
			hasLocaleField: config.hasLocaleField,
		});
		if (!identity) return { error: undefined, data: undefined };

		if (isDirectSelfRedirect(identity)) {
			const message = copy("server:plugin.pages.redirects.target.self");
			return {
				error: {
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: [
							{
								key: redirectFields.targetUrl,
								localeCode: null,
								message,
							},
						],
					},
				},
				data: undefined,
			};
		}

		const uniqueRes = await checkRedirectUniqueness(context, {
			identity,
			versionType: data.versionType,
			documentId: data.documentId,
			tables: meta.collectionTableNames,
			hasLocaleField: config.hasLocaleField,
		});
		if (uniqueRes.error) return uniqueRes;

		return checkRedirectSource(context, {
			config,
			identity,
			versionType: data.versionType,
		});
	};

export default redirectBeforeUpsertHandler;
