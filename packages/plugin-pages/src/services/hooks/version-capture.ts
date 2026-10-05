import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import { releaseScope } from "../../utils/route-scope.js";
import getTargetCollection from "../get-target-collection.js";
import refreshVersionRoute from "./helpers/refresh-version-route.js";

/**
 * Rebuilds a captured proposal's route within its release, so it reflects
 * parents already proposed there, and updates captured descendants beneath
 * it. Snapshots keep the route of the environment they came from.
 */
const versionCaptureHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"versionCapture">["handler"] =>
	async ({ context, toolkit, data, meta }) => {
		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (
			targetCollectionRes.error ||
			data.sourceVersionType !== "latest" ||
			!meta.release
		) {
			return { error: undefined, data: undefined };
		}

		return refreshVersionRoute(context, {
			collection: targetCollectionRes.data,
			collectionInstance: meta.collection,
			tables: meta.collectionTableNames,
			toolkit,
			scope: releaseScope({
				release: meta.release,
				collectionKey: meta.collectionKey,
				fallback: "latest",
			}),
			documentId: data.documentId,
			versionId: data.versionId,
		});
	};

export default versionCaptureHandler;
