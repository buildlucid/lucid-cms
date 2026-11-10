import { LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../utils/resolve-pages-collection-localization.js";
import { resolveRouteScope } from "../../utils/route-scope.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkPathUniqueness,
	checkParentIsPageOfSelf,
	checkRootSlugWithParent,
} from "../checks/index.js";
import getTargetCollection from "../get-target-collection.js";
import setPath from "../set-path.js";
import buildDescendantPaths from "./helpers/build-descendant-paths.js";
import {
	applyDuplicateSlugCandidate,
	getDuplicateSlugSource,
	isPathCollisionError,
} from "./helpers/duplicate-slug.js";
import resolveParentPath from "./helpers/resolve-parent-path.js";

const MAX_DUPLICATE_SLUG_ATTEMPTS = 50;

/**
 * Validates the page's parent and slug, then sets its path. Writes owned
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
			return;
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
				//* Only needed to update translations/value; the value itself is unused.
				path: data.fields?.find(
					(f) => f.key === constants.fields.path.key && f.type === "text",
				),
			},
		});
		if (checkFieldsExistRes.error)
			throw new LucidError(checkFieldsExistRes.error);
		const { slug, parentPage, path } = checkFieldsExistRes.data;

		const checkParentIsPageOfSelfRes = checkParentIsPageOfSelf({
			defaultLocale: localization.storageLocale,
			documentId: data.documentId,
			fields: {
				parentPage: parentPage,
			},
		});
		if (checkParentIsPageOfSelfRes.error)
			throw new LucidError(checkParentIsPageOfSelfRes.error);

		const checkRootSlugWithParentRes = checkRootSlugWithParent({
			localized: localization.enabled,
			defaultLocale: localization.storageLocale,
			fields: {
				slug: slug,
				parentPage: parentPage,
			},
		});
		if (checkRootSlugWithParentRes.error)
			throw new LucidError(checkRootSlugWithParentRes.error);

		// ----------------------------------------------------------------
		// Build, validate and set path

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
			if (circularParentsRes.error)
				throw new LucidError(circularParentsRes.error);
		}

		for (let attempt = 0; ; attempt++) {
			if (isDuplicate && attempt > 0) {
				applyDuplicateSlugCandidate(slug, duplicateSlugSource, attempt);
			}

			const pathRes = await resolveParentPath(context, {
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
			if (pathRes.error) throw new LucidError(pathRes.error);

			const candidatePathField = { ...path };
			setPath({
				path: pathRes.data,
				localization,
				fields: {
					path: candidatePathField,
				},
			});

			const projectedPaths = [
				{
					documentId: data.documentId,
					versionId: data.versionId,
					values: pathRes.data,
				},
			];

			const descendantPathsRes = await buildDescendantPaths(context, {
				documentIds: [data.documentId],
				scope,
				tables: meta.collectionTableNames,
				collection: targetCollectionRes.data,
				collectionInstance: meta.collection,
				parentPathField: candidatePathField,
			});
			if (descendantPathsRes.error)
				throw new LucidError(descendantPathsRes.error);
			projectedPaths.push(...descendantPathsRes.data);

			const checkPathUniquenessRes = await checkPathUniqueness(context, {
				collection: targetCollectionRes.data,
				projectedPaths,
				scope,
				tables: meta.collectionTableNames,
				excludeDocumentIds: projectedPaths.map((doc) => doc.documentId),
			});
			if (checkPathUniquenessRes.error) {
				if (
					!isDuplicate ||
					attempt === MAX_DUPLICATE_SLUG_ATTEMPTS ||
					!isPathCollisionError(checkPathUniquenessRes.error)
				) {
					throw new LucidError(checkPathUniquenessRes.error);
				}
				continue;
			}

			setPath({
				path: pathRes.data,
				localization,
				fields: { path },
			});

			return;
		}
	};

export default beforeUpsertHandler;
