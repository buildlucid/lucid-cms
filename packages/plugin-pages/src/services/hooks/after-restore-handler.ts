import { z } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import getTargetCollection from "../get-target-collection.js";
import refreshVersionRoute from "./helpers/refresh-version-route.js";

/** Repairs latest and environment routes using current references once pages are restored. */
const afterRestoreHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterRestore">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return { error: undefined, data: undefined };
		}

		const versionTypes = [
			"latest",
			...meta.collection.getData.publishing.targets.map((target) => target.key),
		];
		const batchSize = context.config.db.getQueryBatchSize({
			parametersPerItem: 1,
			reservedParameters: versionTypes.length,
		});
		for (let offset = 0; offset < data.ids.length; offset += batchSize) {
			const query = context.db.kysely
				.selectFrom(meta.collectionTableNames.version)
				.select(["id", "document_id", "type"])
				.where("document_id", "in", data.ids.slice(offset, offset + batchSize))
				.where("type", "in", versionTypes)
				.orderBy("document_id");

			const versions = await context.db
				.query("pages.restored-versions.find", () => query)
				.many({
					schema: z.object({
						id: z.number(),
						document_id: z.number(),
						type: z.string(),
					}),
				});
			if (versions.error) return versions;

			for (const version of versions.data) {
				const refreshed = await refreshVersionRoute(context, {
					collection: targetCollectionRes.data,
					collectionInstance: meta.collection,
					tables: meta.collectionTableNames,
					toolkit,
					scope: { type: "version", versionType: version.type },
					documentId: version.document_id,
					versionId: version.id,
				});
				if (refreshed.error) return refreshed;
			}
		}
		return { error: undefined, data: undefined };
	};

export default afterRestoreHandler;
