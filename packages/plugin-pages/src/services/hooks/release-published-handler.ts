import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { LucidHook } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import refreshReleaseTargetRoutes from "../refresh-release-target-routes.js";

/**
 * Rebuilds the routes of every released page per target once the release has
 * published them all, so pages see each other's new environment versions
 * whatever order they were captured in.
 */
const releasePublishedHandler =
	(
		options: PluginOptionsInternal,
	): LucidHook<"releases", "published">["handler"] =>
	async ({ context, toolkit, data }) => {
		for (const collection of options.collections) {
			const documents = data.documents.filter(
				(document) => document.collectionKey === collection.key,
			);
			const collectionInstance = context.config.collections.find(
				(instance) => instance.key === collection.key,
			);
			if (documents.length === 0 || !collectionInstance) continue;

			const tablesRes = await getCollectionTableNames(context, collection.key);
			if (tablesRes.error) return tablesRes;

			const targets = new Set(
				documents.flatMap((document) =>
					document.versions.map((version) => version.target),
				),
			);
			for (const target of targets) {
				const refreshRes = await refreshReleaseTargetRoutes(context, {
					collection,
					collectionInstance,
					tables: tablesRes.data,
					toolkit,
					target,
					members: documents.flatMap((document) => {
						const version = document.versions.find(
							(version) => version.target === target,
						);
						return version
							? [
									{
										releaseDocumentId: document.releaseDocumentId,
										documentId: document.documentId,
										versionId: version.versionId,
									},
								]
							: [];
					}),
				});
				if (refreshRes.error) return refreshRes;
			}
		}

		return { error: undefined, data: undefined };
	};

export default releasePublishedHandler;
