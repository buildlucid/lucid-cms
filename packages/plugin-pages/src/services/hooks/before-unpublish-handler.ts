import { copy, LucidError } from "@lucidcms/core";
import type { LucidHookDocuments } from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../../types/types.js";
import findOrphanedChildren from "../find-orphaned-children.js";
import findSegmentDependents from "../find-segment-dependents.js";
import getTargetCollection from "../get-target-collection.js";

/** Prevents unpublishing documents while published pages still depend on their parent links or route segments. */
const beforeUnpublishHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"beforeUnpublish">["handler"] =>
	async ({ context, data, meta }) => {
		const segmentRes = await findSegmentDependents(context, {
			options,
			collectionKey: meta.collectionKey,
			target: data.versionType,
			documentIds: data.ids,
			excludeDocumentIds: data.ids,
		});
		if (segmentRes.error) throw new LucidError(segmentRes.error);

		if (segmentRes.data.length > 0) {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy("server:plugin.pages.unpublish.segment.dependents", {
					data: { target: data.versionType },
				}),
			});
		}

		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return;
		}

		const orphansRes = await findOrphanedChildren(context, {
			collectionKey: meta.collectionKey,
			tables: meta.collectionTableNames,
			target: data.versionType,
			documentIds: data.ids,
		});
		if (orphansRes.error) throw new LucidError(orphansRes.error);

		if (orphansRes.data.length > 0) {
			throw new LucidError({
				type: "basic",
				status: 400,
				message: copy("server:plugin.pages.unpublish.children.published", {
					data: { target: data.versionType },
				}),
			});
		}

		return;
	};

export default beforeUnpublishHandler;
