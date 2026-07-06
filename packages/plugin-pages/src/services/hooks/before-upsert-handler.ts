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
import type { ParentPageQueryResponse } from "../get-parent-fields.js";
import {
	constructChildFullSlug,
	constructParentFullSlug,
	getDescendantFields,
	getParentFields,
	getTargetCollection,
	setFullSlug,
} from "../index.js";

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

		let parentFieldsData: Array<ParentPageQueryResponse> = [];
		const parentPageId = getParentPageId(parentPage);

		// parent page checks and query
		if (parentPageId !== null) {
			const circularParentsRes = await checkCircularParents(context, {
				documentId: data.data.documentId,
				versionType: data.data.versionType,
				defaultLocale: context.config.localization.defaultLocale,
				collectionKey: targetCollectionRes.data.collectionKey,
				tenantKey: data.meta.tenantKey,
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
				tenantKey: data.meta.tenantKey,
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

		const descendantsRes = await getDescendantFields(context, {
			ids: [data.data.documentId],
			versionType: data.data.versionType,
			collectionKey: targetCollectionRes.data.collectionKey,
			tables: data.meta.collectionTableNames,
		});
		if (descendantsRes.error) return descendantsRes;

		if (descendantsRes.data.length > 0) {
			const descendantFullSlugsRes = constructChildFullSlug({
				descendants: descendantsRes.data,
				localization: context.config.localization,
				parentFullSlugField: candidateFullSlugField,
				collection: targetCollectionRes.data,
			});
			if (descendantFullSlugsRes.error) return descendantFullSlugsRes;

			projectedFullSlugs.push(...descendantFullSlugsRes.data);
		}

		const checkFullSlugUniquenessRes = await checkFullSlugUniqueness(context, {
			collection: targetCollectionRes.data,
			collectionInstance: data.meta.collection,
			projectedFullSlugs,
			versionType: data.data.versionType,
			collectionKey: targetCollectionRes.data.collectionKey,
			tenantKey: data.meta.tenantKey,
			tables: data.meta.collectionTableNames,
			excludeDocumentIds: projectedFullSlugs.map((doc) => doc.documentId),
			inputFields: {
				documentId: data.data.documentId,
				versionId: data.data.versionId,
				fields: data.data.fields ?? [],
			},
		});
		if (checkFullSlugUniquenessRes.error) return checkFullSlugUniquenessRes;

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
	};

export default beforeUpsertHandler;
