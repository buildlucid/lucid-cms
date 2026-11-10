import { copy, z } from "@lucidcms/core";
import type {
	RedirectLookup,
	ResolvedRedirect,
	ServiceFn,
} from "@lucidcms/core/types";
import { PATH_HISTORY_TABLE } from "../../constants.js";
import type { PathHistoryTables } from "../../types/tables.js";
import type { RedirectsConfig } from "../../types/types.js";
import getPublishedVersion from "../../utils/get-published-version.js";
import findCurrentPath from "./find-current-path.js";

/** Pages that most recently used a path are checked first, and only this many. */
const MAX_CANDIDATES = 10;

/**
 * Resolves old paths with a 301, preferring the most recent use in the visitor's locale or
 * unlocalized content. Falls back to other locales; skips unpublished pages.
 */
const findPathHistoryRedirect: ServiceFn<
	[{ config: RedirectsConfig; path: string; lookup: RedirectLookup }],
	ResolvedRedirect | null
> = async (context, data) => {
	try {
		const query = context.db.kysely
			.$extendTables<PathHistoryTables>()
			.selectFrom(PATH_HISTORY_TABLE)
			.select(["collection_key", "document_id", "environment", "locale"])
			.where("path", "=", data.path)
			.where(
				"collection_key",
				"in",
				data.config.collections.map((collection) => collection.key),
			)
			.orderBy("recorded_at", "desc")
			.orderBy("id", "desc");

		const rowsRes = await context.db
			.query("pages.path-history.find", () => query)
			.many({
				schema: z.object({
					collection_key: z.string(),
					document_id: z.number(),
					environment: z.string(),
					locale: z.string().nullable(),
				}),
			});
		if (rowsRes.error) return rowsRes;

		const candidates = rowsRes.data
			.filter((row) => {
				const collection = context.config.collections.find(
					(item) => item.key === row.collection_key,
				);
				return (
					collection !== undefined &&
					getPublishedVersion(collection, data.lookup.environment) ===
						row.environment
				);
			})
			//* unlocalized paths cover every locale, so they compete with the visitor's on recency alone
			.toSorted(
				(a, b) =>
					Number(b.locale === null || b.locale === data.lookup.locale) -
					Number(a.locale === null || a.locale === data.lookup.locale),
			)
			.slice(0, MAX_CANDIDATES);

		for (const row of candidates) {
			const pathRes = await findCurrentPath(context, {
				collectionKey: row.collection_key,
				documentId: row.document_id,
				environment: data.lookup.environment,
				locale: row.locale,
				localized:
					data.config.collections.find(
						(collection) => collection.key === row.collection_key,
					)?.localized ?? false,
			});
			if (pathRes.error) return pathRes;
			if (!pathRes.data || pathRes.data === data.path) continue;

			return {
				error: undefined,
				data: { location: pathRes.data, status: 301 },
			};
		}

		return { error: undefined, data: null };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.redirects.resolve.failed"),
			},
			data: undefined,
		};
	}
};

export default findPathHistoryRedirect;
