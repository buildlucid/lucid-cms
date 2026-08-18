import { copy } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import { COLLECTION_KEY, fields } from "../../constants.js";
import type { RedirectsPluginOptionsInternal } from "../../types.js";
import {
	getRedirectIdentity,
	isDirectSelfRedirect,
} from "../../utils/redirect-input.js";
import checkRedirectUniqueness from "../check-redirect-uniqueness.js";

const beforeUpsertHandler =
	(
		options: RedirectsPluginOptionsInternal,
	): LucidHookDocuments<"beforeUpsert">["handler"] =>
	async (context, payload) => {
		if (payload.meta.collectionKey !== COLLECTION_KEY) {
			return { error: undefined, data: payload.data };
		}

		const identity = getRedirectIdentity({
			fields: payload.data.fields,
			defaultLocale: options.defaultLocale,
			hasLocaleField: options.locales.length > 1,
		});
		if (!identity) return { error: undefined, data: payload.data };

		if (isDirectSelfRedirect(identity)) {
			const message = copy("server:plugin.redirects.target.self", {
				defaultMessage: "A redirect cannot point to its own source path.",
			});
			return {
				error: {
					type: "basic",
					status: 400,
					message,
					errors: {
						fields: [
							{
								key: fields.targetUrl,
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
			versionType: payload.data.versionType,
			documentId: payload.data.documentId,
			tables: payload.meta.collectionTableNames,
			hasLocaleField: options.locales.length > 1,
		});
		if (uniqueRes.error) return uniqueRes;

		return { error: undefined, data: payload.data };
	};

export default beforeUpsertHandler;
