import type { LucidHookDocuments } from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import { getTargetCollection, updateFullSlugFields } from "../index.js";
import buildDescendantFullSlugs from "./helpers/build-descendant-full-slugs.js";

const afterUpsertHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterUpsert">["handler"] =>
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

		// ----------------------------------------------------------------
		// Build and store fullSlugs
		const currentFullSlugField = data.data.fields.find((field) => {
			return field.key === constants.fields.fullSlug.key;
		});
		if (!currentFullSlugField) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const docFullSlugsRes = await buildDescendantFullSlugs(context, {
			documentIds: [data.data.documentId],
			versionType: data.data.versionType,
			collectionKey: targetCollectionRes.data.key,
			tables: data.meta.collectionTableNames,
			collection: targetCollectionRes.data,
			parentFullSlugField: currentFullSlugField,
		});
		if (docFullSlugsRes.error) return docFullSlugsRes;

		if (docFullSlugsRes.data.length === 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const updateFullSlugFieldsRes = await updateFullSlugFields(context, {
			docFullSlugs: docFullSlugsRes.data,
			versionType: data.data.versionType,
			tables: data.meta.collectionTableNames,
		});
		if (updateFullSlugFieldsRes.error) return updateFullSlugFieldsRes;

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterUpsertHandler;
