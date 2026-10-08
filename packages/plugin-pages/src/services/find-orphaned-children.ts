import type { CollectionTableNames, ServiceFn } from "@lucidcms/core/types";
import getDescendantFields from "./get-descendant-fields.js";

/** Finds published children left without parents, excluding binned pages and pages being unpublished together. */
const findOrphanedChildren: ServiceFn<
	[
		{
			collectionKey: string;
			tables: CollectionTableNames;
			target: string;
			documentIds: number[];
		},
	],
	Array<{ documentId: number; parentId: number }>
> = async (context, data) => {
	const descendantsRes = await getDescendantFields(context, {
		ids: data.documentIds,
		scope: { type: "version", versionType: data.target },
		collectionKey: data.collectionKey,
		tables: data.tables,
	});
	if (descendantsRes.error) return descendantsRes;

	const unpublishing = new Set(data.documentIds);
	const orphans = descendantsRes.data.flatMap((descendant) => {
		const parentId = descendant.rows.find(
			(row) => row._parentPage !== null && unpublishing.has(row._parentPage),
		)?._parentPage;
		return parentId == null
			? []
			: [{ documentId: descendant.document_id, parentId }];
	});
	if (orphans.length === 0) return { error: undefined, data: [] };

	const liveRes = await context.db
		.query<{ id: number }>("pages.orphaned-children.live", () =>
			context.db.kysely
				.selectFrom(
					context.db.kysely.dynamic.table(data.tables.document).as("d"),
				)
				.select("d.id")
				.where(
					"d.id",
					"in",
					orphans.map((orphan) => orphan.documentId),
				)
				.where(
					"d.is_deleted",
					"=",
					context.config.db.getDefault("boolean", "false"),
				),
		)
		.many();
	if (liveRes.error) return liveRes;

	const live = new Set(liveRes.data.map((row) => row.id));
	return {
		error: undefined,
		data: orphans.filter((orphan) => live.has(orphan.documentId)),
	};
};

export default findOrphanedChildren;
