import { copy } from "@lucidcms/core";
import { getCollectionTableNames } from "@lucidcms/core/extension";
import type {
	RequestCheckBlocker,
	RequestCheckHookData,
	ServiceFn,
} from "@lucidcms/core/types";
import type { PluginOptionsInternal } from "../types/types.js";
import findOrphanedChildren from "./find-orphaned-children.js";
import findSegmentDependents from "./find-segment-dependents.js";

/** Reports unpublish request documents that would leave published pages without required parents or route segments. */
const checkUnpublishDependents: ServiceFn<
	[
		{
			options: PluginOptionsInternal;
			documents: RequestCheckHookData["documents"];
		},
	],
	RequestCheckBlocker[]
> = async (context, data) => {
	const blockers: RequestCheckBlocker[] = [];

	for (const [collectionKey, documents] of Map.groupBy(
		data.documents,
		(document) => document.collectionKey,
	)) {
		const isPages = data.options.collections.some(
			(collection) => collection.key === collectionKey,
		);
		const tablesRes = isPages
			? await getCollectionTableNames(context, collectionKey)
			: undefined;
		if (tablesRes?.error) return tablesRes;

		for (const target of new Set(
			documents.flatMap((document) => document.targets),
		)) {
			const members = documents.filter((document) =>
				document.targets.includes(target),
			);
			const memberIds = members.map((member) => member.documentId);
			const block = (requestDocumentId: number, key: "children" | "segment") =>
				blockers.push({
					requestDocumentId,
					target,
					message: context.translate(
						key === "children"
							? copy("server:plugin.pages.request.unpublish.children", {
									data: { target },
								})
							: copy("server:plugin.pages.request.unpublish.segment", {
									data: { target },
								}),
					),
				});

			for (const member of members) {
				const segmentRes = await findSegmentDependents(context, {
					options: data.options,
					collectionKey,
					target,
					documentIds: [member.documentId],
					excludeDocumentIds: memberIds,
				});
				if (segmentRes.error) return segmentRes;
				if (segmentRes.data.length > 0) {
					block(member.requestDocumentId, "segment");
				}
			}

			if (!tablesRes) continue;
			const orphansRes = await findOrphanedChildren(context, {
				collectionKey,
				tables: tablesRes.data,
				target,
				documentIds: memberIds,
			});
			if (orphansRes.error) return orphansRes;

			const parentIds = new Set(
				orphansRes.data.map((orphan) => orphan.parentId),
			);
			for (const member of members) {
				if (parentIds.has(member.documentId)) {
					block(member.requestDocumentId, "children");
				}
			}
		}
	}

	return { error: undefined, data: blockers };
};

export default checkUnpublishDependents;
