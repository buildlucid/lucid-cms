import {
	getDescendantFields,
	getTargetCollection,
	constructChildFullSlug,
	updateFullSlugFields,
} from "../index.js";
import constants from "../../constants.js";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";

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
		const descendantsRes = await getDescendantFields(context, {
			ids: [data.data.documentId],
			versionType: data.data.versionType,
			tables: data.meta.collectionTableNames,
		});
		if (descendantsRes.error) return descendantsRes;

		// exit early - nothing to do
		if (descendantsRes.data.length === 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const currentFullSlugField = data.data.fields.find((field) => {
			return field.key === constants.fields.fullSlug.key;
		});
		if (!currentFullSlugField) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const docFullSlugsRes = constructChildFullSlug({
			descendants: descendantsRes.data,
			localization: context.config.localization,
			parentFullSlugField: currentFullSlugField,
			collection: targetCollectionRes.data,
		});
		if (docFullSlugsRes.error) return docFullSlugsRes;

		await updateFullSlugFields(context, {
			docFullSlugs: docFullSlugsRes.data,
			versionType: data.data.versionType,
			tables: data.meta.collectionTableNames,
		});

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterUpsertHandler;
