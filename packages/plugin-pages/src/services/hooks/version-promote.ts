import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import fieldResToSchema from "../../utils/field-res-to-schema.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import resolvePagesCollectionLocalization from "../../utils/resolve-pages-collection-localization.js";
import {
	checkCircularParents,
	checkFieldsExist,
	checkFullSlugUniqueness,
} from "../checks/index.js";
import {
	getDocumentVersionFields,
	getTargetCollection,
	setFullSlug,
	updateFullSlugFields,
	updateSlugFields,
} from "../index.js";
import afterUpsertHandler from "./after-upsert-handler.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";
import resolveParentFullSlug from "./helpers/resolve-parent-full-slug.js";

const versionPromoteHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"versionPromote">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		// ----------------------------------------------------------------
		// Validation / Setup
		if (
			!options.collections.some(
				(collection) => collection.key === meta.collectionKey,
			)
		) {
			return afterUpsertHandler(options)({
				context,
				toolkit,
				meta,
				data: {
					...data,
					bricks: [],
					fields: [],
				},
			});
		}

		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) return targetCollectionRes;
		const localization = resolvePagesCollectionLocalization({
			localization: context.config.localization,
			collection: targetCollectionRes.data,
			collectionInstance: meta.collection,
		});

		let createFullSlug = true;

		// fetch the document versions, slug and parent page fields
		const docVersionFieldRes = await getDocumentVersionFields(context, {
			documentId: data.documentId,
			versionId: data.versionId,
			versionType: data.versionType,
			collectionKey: targetCollectionRes.data.key,
			tables: meta.collectionTableNames,
		});
		if (docVersionFieldRes.error) return docVersionFieldRes;
		if (docVersionFieldRes.data === null) createFullSlug = false;

		// Format fields
		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: fieldResToSchema(
					constants.fields.slug.key,
					targetCollectionRes.data.localized,
					localization,
					docVersionFieldRes.data || [],
				),
				parentPage: fieldResToSchema(
					constants.fields.parentPage.key,
					false,
					localization,
					docVersionFieldRes.data || [],
					targetCollectionRes.data.key,
				),
				fullSlug: fieldResToSchema(
					constants.fields.fullSlug.key,
					targetCollectionRes.data.localized,
					localization,
					docVersionFieldRes.data || [],
				),
			},
		});
		if (checkFieldsExistRes.error) return checkFieldsExistRes;
		const { slug, parentPage, fullSlug } = checkFieldsExistRes.data;

		// ----------------------------------------------------------------
		// create fullSlug - close to the beforeUpsert hook
		if (createFullSlug) {
			const parentPageId = getParentPageId(parentPage);

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
					all: [slug, parentPage, fullSlug],
				},
				documentVersionId: data.versionId,
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
			if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

			setFullSlug({
				fullSlug: fullSlugRes.data,
				localization,
				fields: {
					fullSlug: fullSlug,
				},
			});

			const updateSlugRes = await updateSlugFields(context, {
				collectionKey: meta.collectionKey,
				docSlugs: [
					{
						documentId: data.documentId,
						versionId: data.versionId,
						slugs: slug.translations
							? new Map(Object.entries(slug.translations))
							: new Map([[null, slug.value ?? null]]),
					},
				],
				versionType: data.versionType,
				tables: meta.collectionTableNames,
			});
			if (updateSlugRes.error) return updateSlugRes;

			const updateFullSlugRes = await updateFullSlugFields(context, {
				collectionKey: meta.collectionKey,
				docFullSlugs: [
					{
						documentId: data.documentId,
						versionId: data.versionId,
						fullSlugs: fullSlugRes.data,
					},
				],
				versionType: data.versionType,
				tables: meta.collectionTableNames,
			});
			if (updateFullSlugRes.error) return updateFullSlugRes;
		}

		// ----------------------------------------------------------------
		// run the afterUpsert hook to update all of the documents versions potential descendants
		const afterUpsertRes = await afterUpsertHandler(options)({
			context,
			toolkit,
			meta: {
				collection: meta.collection,
				collectionKey: meta.collectionKey,
				userId: meta.userId,
				collectionTableNames: meta.collectionTableNames,
			},
			data: {
				documentId: data.documentId,
				versionId: data.versionId,
				versionType: data.versionType,
				bricks: [],
				fields: [slug, parentPage, fullSlug],
			},
		});
		if (afterUpsertRes.error) return afterUpsertRes;

		return {
			error: undefined,
			data: undefined,
		};
	};

export default versionPromoteHandler;
