import { getCollectionTableNames } from "@lucidcms/core/extension";
import type { LucidHook } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import checkRequestTargetRoutes from "../check-request-target-routes.js";
import checkUnpublishDependents from "../check-unpublish-dependents.js";

/** Checks page routes and prevents requests from leaving published pages without required parents or route segments. */
const requestCheckHandler =
	(options: PluginOptionsInternal): LucidHook<"requests", "check">["handler"] =>
	async ({ context, data }) => {
		if (data.request.type === "unpublish") {
			return checkUnpublishDependents(context, { options, data });
		}

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
				const blockersRes = await checkRequestTargetRoutes(context, {
					collection,
					collectionInstance,
					tables: tablesRes.data,
					target,
					members: documents
						.filter((document) => document.targets.includes(target))
						.map((document) => ({
							requestDocumentId: document.requestDocumentId,
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

export default requestCheckHandler;
