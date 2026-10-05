import { copy, z } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { RouteScope } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import getParentPageRelationTable from "../../utils/get-parent-page-relation-table.js";
import { scopeVersionFilter } from "../../utils/route-scope.js";

/**
 * Walks up the parent chain, reading each ancestor in the scope's version, and
 * errors when it leads back to the document or loops among the ancestors. The
 * query uses UNION, so a loop ends it instead of recursing forever, and the
 * returned chain is then followed in memory to find one.
 */
const checkCircularParents: ServiceFn<
	[
		{
			documentId: number;
			scope: RouteScope;
			collectionKey: string;
			fields: {
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const parentPageId = getParentPageId(data.fields.parentPage);

		if (!data.documentId || parentPageId === null) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const { version: versionTable } = data.tables;
		const parentPageField = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const query = context.db.kysely
			.withRecursive("ancestors", (recursive) =>
				recursive
					.selectFrom(parentPageTable)
					.innerJoin(
						versionTable,
						`${versionTable}.id`,
						`${parentPageTable}.document_version_id`,
					)
					.select([
						`${versionTable}.document_id as current_id`,
						`${parentPageTable}.${parentPageField} as parent_id`,
					])
					.where(`${parentPageTable}.locale`, "is", null)
					.where(scopeVersionFilter(versionTable, data.scope))
					.where(`${versionTable}.document_id`, "=", parentPageId)
					.union(
						recursive
							.selectFrom(parentPageTable)
							.innerJoin(
								versionTable,
								`${versionTable}.id`,
								`${parentPageTable}.document_version_id`,
							)
							.innerJoin(
								"ancestors",
								"ancestors.parent_id",
								`${versionTable}.document_id`,
							)
							.select([
								`${versionTable}.document_id as current_id`,
								`${parentPageTable}.${parentPageField} as parent_id`,
							])
							.where(`${parentPageTable}.locale`, "is", null)
							.where(scopeVersionFilter(versionTable, data.scope)),
					),
			)
			.selectFrom("ancestors")
			.select(["current_id", "parent_id"]);

		const resultResponse = await context.db
			.query("pages.circular-parent.check", () => query)
			.many({
				schema: z.object({
					current_id: z.number(),
					parent_id: z.number().nullable(),
				}),
			});
		if (resultResponse.error) return resultResponse;
		const parents = new Map(
			resultResponse.data.map((row) => [row.current_id, row.parent_id]),
		);

		const visited = new Set<number>();
		let current: number | null = parentPageId;
		while (current !== null) {
			const message =
				current === data.documentId
					? copy("server:plugin.pages.parents.circular")
					: visited.has(current)
						? copy("server:plugin.pages.parents.loop")
						: undefined;
			if (message) {
				return {
					error: {
						type: "basic",
						status: 400,
						message,
						errors: {
							fields: [
								{
									key: constants.fields.parentPage.key,
									localeCode: null,
									message,
								},
							],
						},
					},
					data: undefined,
				};
			}
			visited.add(current);
			current = parents.get(current) ?? null;
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.parents.circular.check.failed"),
			},
			data: undefined,
		};
	}
};

export default checkCircularParents;
