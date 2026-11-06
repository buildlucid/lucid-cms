import collections from "../../libs/collection/collections.js";
import resolveCollectionLocalization from "../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import getTranslationStatus from "../../libs/translations/get-translation-status.js";
import type { LucidActor } from "../../types/hono.js";
import type { DocumentTranslationStatus } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import readDocumentContent from "../documents/helpers/read-document-content.js";

/** How each document's latest translations compare with its default locale, eg. before translating them. */
const getStatus: ServiceFn<
	[{ collectionKey: string; documentIds: number[]; user: LucidActor }],
	DocumentTranslationStatus[]
> = async (context, data) => {
	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [
				getCollectionPermission(data.collectionKey, "read"),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.permission.error.message", {
					data: { collection: data.collectionKey, action: "read" },
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection: collectionRes.data,
	});
	if (!localization.enabled) return { error: undefined, data: [] };

	const statuses: DocumentTranslationStatus[] = [];
	for (const id of new Set(data.documentIds)) {
		const contentRes = await readDocumentContent(context, {
			collectionKey: data.collectionKey,
			id,
		});
		if (contentRes.error) return contentRes;

		statuses.push({
			collectionKey: data.collectionKey,
			documentId: id,
			sourceLocale: localization.defaultLocale,
			locales: getTranslationStatus({
				collection: collectionRes.data,
				localization,
				content: contentRes.data.stored,
			}),
		});
	}

	return { error: undefined, data: statuses };
};

export default getStatus;
