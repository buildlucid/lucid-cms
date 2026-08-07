import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
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
	async (context, data) => {
		// ----------------------------------------------------------------
		// Validation / Setup

		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: data.meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: data.data.fields?.find(
					(f) => f.key === constants.fields.slug.key && f.type === "text",
				),
				parentPage: data.data.fields?.find(
					(f) =>
						f.key === constants.fields.parentPage.key && f.type === "relation",
				),
				//* dont care what this value is - only needed to update translations/value
				fullSlug: data.data.fields?.find(
					(f) => f.key === constants.fields.fullSlug.key && f.type === "text",
				),
			},
		});
		if (checkFieldsExistRes.error) return checkFieldsExistRes;
		const { slug, parentPage, fullSlug } = checkFieldsExistRes.data;

		const checkParentIsPageOfSelfRes = checkParentIsPageOfSelf({
			defaultLocale: context.config.localization.defaultLocale,
			documentId: data.data.documentId,
			fields: {
				parentPage: parentPage,
			},
		});
		if (checkParentIsPageOfSelfRes.error) return checkParentIsPageOfSelfRes;

		const checkRootSlugWithParentRes = checkRootSlugWithParent({
			collection: targetCollectionRes.data,
			defaultLocale: context.config.localization.defaultLocale,
			fields: {
				slug: slug,
				parentPage: parentPage,
			},
		});
		if (checkRootSlugWithParentRes.error) return checkRootSlugWithParentRes;

		// ----------------------------------------------------------------
		// Build, validate and set fullSlug

		const parentPageId = getParentPageId(parentPage);
		const isDuplicate = data.meta.execution.origin.type === "duplicate";
		const duplicateSlugSource = getDuplicateSlugSource(slug);

		// parent page checks and query
		if (parentPageId !== null) {
			const circularParentsRes = await checkCircularParents(context, {
				documentId: data.data.documentId,
				versionType: data.data.versionType,
				defaultLocale: context.config.localization.defaultLocale,
				collectionKey: targetCollectionRes.data.key,
				fields: {
					parentPage: parentPage,
				},
				tables: data.meta.collectionTableNames,
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
				collectionKey: targetCollectionRes.data.key,
				versionType: data.data.versionType,
				tables: data.meta.collectionTableNames,
				fields: {
					slug: slug,
					parentPage,
				},
			});
			if (fullSlugRes.error) return fullSlugRes;

			const candidateFullSlugField = { ...fullSlug };
			setFullSlug({
				fullSlug: fullSlugRes.data,
				defaultLocale: context.config.localization.defaultLocale,
				collection: targetCollectionRes.data,
				fields: {
					fullSlug: candidateFullSlugField,
				},
			});

			const projectedFullSlugs = [
				{
					documentId: data.data.documentId,
					versionId: data.data.versionId,
					fullSlugs: fullSlugRes.data,
				},
			];

			const descendantFullSlugsRes = await buildDescendantFullSlugs(context, {
				documentIds: [data.data.documentId],
				versionType: data.data.versionType,
				collectionKey: targetCollectionRes.data.key,
				tables: data.meta.collectionTableNames,
				collection: targetCollectionRes.data,
				parentFullSlugField: candidateFullSlugField,
			});
			if (descendantFullSlugsRes.error) return descendantFullSlugsRes;
			projectedFullSlugs.push(...descendantFullSlugsRes.data);

			const checkFullSlugUniquenessRes = await checkFullSlugUniqueness(
				context,
				{
					collection: targetCollectionRes.data,
					collectionInstance: data.meta.collection,
					projectedFullSlugs,
					versionType: data.data.versionType,
					collectionKey: targetCollectionRes.data.key,
					tables: data.meta.collectionTableNames,
					excludeDocumentIds: projectedFullSlugs.map((doc) => doc.documentId),
					inputFields: {
						documentId: data.data.documentId,
						versionId: data.data.versionId,
						fields: data.data.fields ?? [],
					},
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
				defaultLocale: context.config.localization.defaultLocale,
				collection: targetCollectionRes.data,
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
