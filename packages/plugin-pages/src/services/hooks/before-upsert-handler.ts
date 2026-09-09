import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../utils/resolve-pages-collection-localization.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkFullSlugUniqueness,
	checkParentIsPageOfSelf,
	checkRootSlugWithParent,
} from "../checks/index.js";
import { getTargetCollection, setFullSlug } from "../index.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import {
	applyDuplicateSlugCandidate,
	getDuplicateSlugSource,
	isFullSlugCollisionError,
} from "./helpers/duplicate-slug.js";
import resolveParentFullSlug from "./helpers/resolve-parent-full-slug.js";

const MAX_DUPLICATE_SLUG_ATTEMPTS = 50;

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

		// parent page checks and query
		if (parentPageId !== null) {
			const circularParentsRes = await checkCircularParents(context, {
				documentId: data.documentId,
				versionType: data.versionType,
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

			// fullSlug construction
			const fullSlugRes = await resolveParentFullSlug(context, {
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				collectionKey: targetCollectionRes.data.key,
				versionType: data.versionType,
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
					fullSlugs: fullSlugRes.data,
				},
			];

			const descendantFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.documentId],
				versionType: data.versionType,
				collectionKey: targetCollectionRes.data.key,
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
					versionType: data.versionType,
					collectionKey: targetCollectionRes.data.key,
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
