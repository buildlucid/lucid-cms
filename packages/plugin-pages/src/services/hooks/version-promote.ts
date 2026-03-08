import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import fieldResToSchema from "../../utils/field-res-to-schema.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import normalizePathField from "../../utils/normalize-path-field.js";
import {
	checkCircularParents,
	checkDuplicateSlugParents,
	checkFieldsExist,
} from "../checks/index.js";
import type { ParentPageQueryResponse } from "../get-parent-fields.js";
import {
	constructParentFullSlug,
	getDocumentVersionFields,
	getParentFields,
	getTargetCollection,
	setFullSlug,
	updateFullSlugFields,
	updateSlugFields,
} from "../index.js";
import afterUpsertHandler from "./after-upsert-handler.js";

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
			collectionKey: targetCollectionRes.data.collectionKey,
			tables: data.meta.collectionTableNames,
		});
		if (docVersionFieldRes.error) return docVersionFieldRes;
		if (docVersionFieldRes.data === null) createFullSlug = false;

		// Format fields
		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: fieldResToSchema(
					constants.fields.slug.key,
					targetCollectionRes.data.useTranslations,
					context.config.localization.defaultLocale,
					docVersionFieldRes.data || [],
				),
				parentPage: fieldResToSchema(
					constants.fields.parentPage.key,
					false,
					context.config.localization.defaultLocale,
					docVersionFieldRes.data || [],
					targetCollectionRes.data.collectionKey,
				),
				fullSlug: fieldResToSchema(
					constants.fields.fullSlug.key,
					targetCollectionRes.data.useTranslations,
					context.config.localization.defaultLocale,
					docVersionFieldRes.data || [],
				),
			},
		});
		if (checkFieldsExistRes.error) return checkFieldsExistRes;
		const { slug, parentPage, fullSlug } = checkFieldsExistRes.data;
		normalizePathField(slug);

		// ----------------------------------------------------------------
		// create fullSlug - close to the beforeUpsert hook
		if (createFullSlug) {
			const checkDuplicateSlugParentsRes = await checkDuplicateSlugParents(
				context,
				{
					documentId: data.data.documentId,
					versionId: data.data.versionId,
					versionType: data.data.versionType,
					collectionKey: targetCollectionRes.data.collectionKey,
					fields: {
						slug: slug,
						parentPage: parentPage,
					},
					tables: data.meta.collectionTableNames,
				},
			);
			if (checkDuplicateSlugParentsRes.error)
				return checkDuplicateSlugParentsRes;

			let parentFieldsData: Array<ParentPageQueryResponse> = [];
			const parentPageId = getParentPageId(parentPage);

			// parent page checks and query
			if (parentPageId !== null) {
				const circularParentsRes = await checkCircularParents(context, {
					documentId: data.data.documentId,
					versionType: data.data.versionType,
					defaultLocale: context.config.localization.defaultLocale,
					collectionKey: targetCollectionRes.data.collectionKey,
					fields: {
						parentPage: parentPage,
					},
					tables: data.meta.collectionTableNames,
				});
				if (circularParentsRes.error) return circularParentsRes;

				const parentFieldsRes = await getParentFields(context, {
					defaultLocale: context.config.localization.defaultLocale,
					versionType: data.data.versionType,
					collectionKey: targetCollectionRes.data.collectionKey,
					fields: {
						parentPage: parentPage,
					},
					tables: data.meta.collectionTableNames,
				});
				if (parentFieldsRes.error) return parentFieldsRes;

				parentFieldsData = parentFieldsRes.data;
			}

			// fullSlug construction
			const fullSlugRes = constructParentFullSlug({
				parentFields: parentFieldsData,
				localization: context.config.localization,
				collection: targetCollectionRes.data,
				fields: {
					slug: slug,
				},
			});
			if (fullSlugRes.error) return fullSlugRes;

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
		await afterUpsertHandler(options)(context, {
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

		return {
			error: undefined,
			data: undefined,
		};
	};

export default versionPromoteHandler;
