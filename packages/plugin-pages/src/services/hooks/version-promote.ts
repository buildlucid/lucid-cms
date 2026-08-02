import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import fieldResToSchema from "../../utils/field-res-to-schema.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
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
	async (context, data) => {
		// ----------------------------------------------------------------
		// Validation / Setup
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: data.meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			//* early return as doesnt apply to the current collection
			return {
				error: undefined,
				data: undefined,
			};
		}

		let createFullSlug = true;

		// fetch the document versions, slug and parent page fields
		const docVersionFieldRes = await getDocumentVersionFields(context, {
			documentId: data.data.documentId,
			versionId: data.data.versionId,
			versionType: data.data.versionType,
			collectionKey: targetCollectionRes.data.key,
			tables: data.meta.collectionTableNames,
		});
		if (docVersionFieldRes.error) return docVersionFieldRes;
		if (docVersionFieldRes.data === null) createFullSlug = false;

		// Format fields
		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: fieldResToSchema(
					constants.fields.slug.key,
					targetCollectionRes.data.localized,
					context.config.localization.defaultLocale,
					docVersionFieldRes.data || [],
				),
				parentPage: fieldResToSchema(
					constants.fields.parentPage.key,
					false,
					context.config.localization.defaultLocale,
					docVersionFieldRes.data || [],
					targetCollectionRes.data.key,
				),
				fullSlug: fieldResToSchema(
					constants.fields.fullSlug.key,
					targetCollectionRes.data.localized,
					context.config.localization.defaultLocale,
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
				},
			);
			if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

			setFullSlug({
				fullSlug: fullSlugRes.data,
				defaultLocale: context.config.localization.defaultLocale,
				collection: targetCollectionRes.data,
				fields: {
					fullSlug: fullSlug,
				},
			});

			const updateSlugRes = await updateSlugFields(context, {
				docSlugs: [
					{
						documentId: data.data.documentId,
						versionId: data.data.versionId,
						slugs: slug.translations || {
							[context.config.localization.defaultLocale]: slug.value || null,
						},
					},
				],
				versionType: data.data.versionType,
				tables: data.meta.collectionTableNames,
			});
			if (updateSlugRes.error) return updateSlugRes;

			const updateFullSlugRes = await updateFullSlugFields(context, {
				docFullSlugs: [
					{
						documentId: data.data.documentId,
						versionId: data.data.versionId,
						fullSlugs: fullSlugRes.data,
					},
				],
				versionType: data.data.versionType,
				tables: data.meta.collectionTableNames,
			});
			if (updateFullSlugRes.error) return updateFullSlugRes;
		}

		// ----------------------------------------------------------------
		// run the afterUpsert hook to update all of the documents versions potential descendants
		const afterUpsertRes = await afterUpsertHandler(options)(context, {
			meta: {
				collection: data.meta.collection,
				collectionKey: data.meta.collectionKey,
				userId: data.meta.userId,
				collectionTableNames: data.meta.collectionTableNames,
			},
			data: {
				documentId: data.data.documentId,
				versionId: data.data.versionId,
				versionType: data.data.versionType,
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
