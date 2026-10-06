import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../utils/resolve-pages-collection-localization.js";
import { resolveRouteScope } from "../../utils/route-scope.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkFullSlugUniqueness,
	checkParentIsPageOfSelf,
	checkRootSlugWithParent,
} from "../checks/index.js";
import getTargetCollection from "../get-target-collection.js";
import setFullSlug from "../set-full-slug.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import {
	applyDuplicateSlugCandidate,
	getDuplicateSlugSource,
	isFullSlugCollisionError,
} from "./helpers/duplicate-slug.js";
import resolveParentFullSlug from "./helpers/resolve-parent-full-slug.js";

const MAX_DUPLICATE_SLUG_ATTEMPTS = 50;

/**
 * Validates the page's parent and slug, then sets its fullSlug. Writes owned
 * by a request read parents from the request's own versions, falling back to
 * latest, and never compare against other requests.
 */
const beforeUpsertHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"beforeUpsert">["handler"] =>
	async ({ context, data, meta }) => {
		// ----------------------------------------------------------------
		// Validation / Setup

		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return {
				error: undefined,
				data: undefined,
			};
		}
		const localization = resolvePagesCollectionLocalization({
			localization: context.config.localization,
			collection: targetCollectionRes.data,
			collectionInstance: meta.collection,
		});
		const scope = resolveRouteScope({
			versionType: data.versionType,
			request: meta.request,
			collectionKey: meta.collectionKey,
		});

		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: data.fields?.find(
					(f) => f.key === constants.fields.slug.key && f.type === "text",
				),
				parentPage: data.fields?.find(
					(f) =>
						f.key === constants.fields.parentPage.key && f.type === "relation",
				),
				//* dont care what this value is - only needed to update translations/value
				fullSlug: data.fields?.find(
					(f) => f.key === constants.fields.fullSlug.key && f.type === "text",
				),
			},
		});
		if (checkFieldsExistRes.error) return checkFieldsExistRes;
		const { slug, parentPage, fullSlug } = checkFieldsExistRes.data;

		const checkParentIsPageOfSelfRes = checkParentIsPageOfSelf({
			defaultLocale: localization.storageLocale,
			documentId: data.documentId,
			fields: {
				parentPage: parentPage,
			},
		});
		if (checkParentIsPageOfSelfRes.error) return checkParentIsPageOfSelfRes;

		const checkRootSlugWithParentRes = checkRootSlugWithParent({
			localized: localization.enabled,
			defaultLocale: localization.storageLocale,
			fields: {
				slug: slug,
				parentPage: parentPage,
			},
		});
		if (checkRootSlugWithParentRes.error) return checkRootSlugWithParentRes;

		// ----------------------------------------------------------------
		// Build, validate and set fullSlug

		const parentPageId = getParentPageId(parentPage);
		const isDuplicate = meta.execution.origin.type === "duplicate";
		const duplicateSlugSource = getDuplicateSlugSource(slug);

		if (parentPageId !== null) {
			const circularParentsRes = await checkCircularParents(context, {
				documentId: data.documentId,
				scope,
				collectionKey: targetCollectionRes.data.key,
				fields: {
					parentPage: parentPage,
				},
				tables: meta.collectionTableNames,
			});
			if (circularParentsRes.error) return circularParentsRes;
		}

		for (let attempt = 0; ; attempt++) {
			if (isDuplicate && attempt > 0) {
				applyDuplicateSlugCandidate(slug, duplicateSlugSource, attempt);
			}

			const fullSlugRes = await resolveParentFullSlug(context, {
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				scope,
				tables: meta.collectionTableNames,
				fields: {
					slug: slug,
					parentPage,
					all: data.fields ?? [],
				},
			});
			if (fullSlugRes.error) return fullSlugRes;

			const candidateFullSlugField = { ...fullSlug };
			setFullSlug({
				fullSlug: fullSlugRes.data,
				localization,
				fields: {
					fullSlug: candidateFullSlugField,
				},
			});

			const projectedFullSlugs = [
				{
					documentId: data.documentId,
					versionId: data.versionId,
					values: fullSlugRes.data,
				},
			];

			const descendantFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.documentId],
				scope,
				tables: meta.collectionTableNames,
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				parentFullSlugField: candidateFullSlugField,
			});
			if (descendantFullSlugsRes.error) return descendantFullSlugsRes;
			projectedFullSlugs.push(...descendantFullSlugsRes.data);

			const checkFullSlugUniquenessRes = await checkFullSlugUniqueness(
				context,
				{
					collection: targetCollectionRes.data,
					projectedFullSlugs,
					scope,
					tables: meta.collectionTableNames,
					excludeDocumentIds: projectedFullSlugs.map((doc) => doc.documentId),
				},
			);
			if (checkFullSlugUniquenessRes.error) {
				if (
					!isDuplicate ||
					attempt === MAX_DUPLICATE_SLUG_ATTEMPTS ||
					!isFullSlugCollisionError(checkFullSlugUniquenessRes.error)
				) {
					return checkFullSlugUniquenessRes;
				}
				continue;
			}

			setFullSlug({
				fullSlug: fullSlugRes.data,
				localization,
				fields: {
					fullSlug: fullSlug,
				},
			});

			return {
				error: undefined,
				data: undefined,
			};
		}
	};

export default beforeUpsertHandler;
