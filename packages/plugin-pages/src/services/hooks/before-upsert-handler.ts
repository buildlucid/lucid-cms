import constants from "../../constants.js";
import {
	checkDuplicateSlugParents,
	checkRootSlugWithParent,
	checkParentIsPageOfSelf,
	checkFieldsExist,
	checkCircularParents,
} from "../checks/index.js";
import {
	getTargetCollection,
	getParentFields,
	constructParentFullSlug,
	setFullSlug,
} from "../index.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { ParentPageQueryResponse } from "../get-parent-fields.js";

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
				data: data.data,
			};
		}

		const checkFieldsExistRes = checkFieldsExist({
			fields: {
				slug: data.data.fields?.find(
					(f) => f.key === constants.fields.slug.key && f.type === "text",
				),
				parentPage: data.data.fields?.find(
					(f) =>
						f.key === constants.fields.parentPage.key && f.type === "document",
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
		if (checkDuplicateSlugParentsRes.error) return checkDuplicateSlugParentsRes;

		// throw new Error("test error for transaction rollback");

		// ----------------------------------------------------------------
		// Build and set fullSlug

		let parentFieldsData: Array<ParentPageQueryResponse> = [];

		// parent page checks and query
		if (parentPage.value) {
			const circularParentsRes = await checkCircularParents(context, {
				documentId: data.data.documentId,
				versionType: data.data.versionType,
				defaultLocale: context.config.localization.defaultLocale,
				fields: {
					parentPage: parentPage,
				},
				tables: data.meta.collectionTableNames,
			});
			if (circularParentsRes.error) return circularParentsRes;

			const parentFieldsRes = await getParentFields(context, {
				defaultLocale: context.config.localization.defaultLocale,
				versionType: data.data.versionType,
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

		return {
			error: undefined,
			data: data.data,
		};
	};

export default beforeUpsertHandler;
