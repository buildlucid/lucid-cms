import { z } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import versionPromoteHandler from "./version-promote.js";

/** Repairs routes using current references before restored pages become searchable. */
const afterRestoreHandler = (
	options: PluginOptionsInternal,
): LucidHookDocuments<"afterRestore">["handler"] => {
	const refreshVersion = versionPromoteHandler(options);
	return async ({ context, toolkit, data, meta }) => {
		if (
			!options.collections.some(
				(collection) => collection.key === meta.collectionKey,
			)
		) {
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
			const versions = await context.db
				.query("pages.restored-versions.find", (db) =>
					db
						.selectFrom(meta.collectionTableNames.version)
						.select(["id", "document_id", "type"])
						.where(
							"document_id",
							"in",
							data.ids.slice(offset, offset + batchSize),
						)
						.where("type", "in", versionTypes)
						.orderBy("document_id"),
				)
				.many({
					schema: z.object({
						id: z.number(),
						document_id: z.number(),
						type: z.string(),
					}),
				});
			if (versions.error) return versions;

			for (const version of versions.data) {
				const refreshed = await refreshVersion({
					context,
					toolkit,
					meta: { ...meta, userId: null },
					data: {
						documentId: version.document_id,
						versionId: version.id,
						versionType: version.type,
					},
				});
				if (refreshed.error) return refreshed;
			}
		}
		return { error: undefined, data: undefined };
	};
};

export default afterRestoreHandler;
