import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { LucidHook } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import checkReleaseTargetRoutes from "../check-release-target-routes.js";

/**
 * Blocks a release whose pages would not have a valid, unique route in a
 * target environment. Each target is checked on its own, as only the pages
 * released to it change there.
 */
const releaseCheckHandler =
	(options: PluginOptionsInternal): LucidHook<"releases", "check">["handler"] =>
	async ({ context, data }) => {
		for (const collection of options.collections) {
			const documents = data.documents.flatMap((document) =>
				document.collectionKey === collection.key && document.versionId !== null
					? [{ ...document, versionId: document.versionId }]
					: [],
			);
			const collectionInstance = context.config.collections.find(
				(instance) => instance.key === collection.key,
			);
			if (documents.length === 0 || !collectionInstance) continue;

			const tablesRes = await getCollectionTableNames(context, collection.key);
			if (tablesRes.error) return tablesRes;

			const targets = new Set(
				documents.flatMap((document) => document.targets),
			);
			for (const target of targets) {
				const blockersRes = await checkReleaseTargetRoutes(context, {
					collection,
					collectionInstance,
					tables: tablesRes.data,
					target,
					members: documents
						.filter((document) => document.targets.includes(target))
						.map((document) => ({
							releaseDocumentId: document.releaseDocumentId,
							documentId: document.documentId,
							versionId: document.versionId,
						})),
				});
				if (blockersRes.error) return blockersRes;
				data.blockers.push(...blockersRes.data);
			}
		}

		return { error: undefined, data: undefined };
	};

export default releaseCheckHandler;
