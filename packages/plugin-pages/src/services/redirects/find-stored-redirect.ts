import { copy, z } from "@lucidcms/core";
import {
	buildTableName,
	getCollectionTableNames,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidBrickTableName,
	LucidDB,
	RedirectLookup,
	RedirectStatus,
	ResolvedRedirect,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import {
	REDIRECTS_COLLECTION_KEY,
	redirectFields,
	redirectTargetTypes,
} from "../../constants.js";
import type { RedirectsConfig } from "../../types/types.js";
import getPublishedVersion from "../../utils/get-published-version.js";
import redirectTargetPath from "../../utils/redirect-target-path.js";
import findCurrentPath from "./find-current-path.js";

const statuses: Record<string, RedirectStatus> = {
	"301": 301,
	"302": 302,
	"307": 307,
	"308": 308,
};

/**
 * Finds a published redirect, preferring the visitor's locale. Page targets resolve to their
 * current path; unavailable targets are skipped.
 */
const findStoredRedirect: ServiceFn<
	[{ config: RedirectsConfig; path: string; lookup: RedirectLookup }],
	ResolvedRedirect | null
> = async (context, data) => {
	const collection = context.config.collections.find(
		(item) => item.key === REDIRECTS_COLLECTION_KEY,
	);
	if (!collection) return { error: undefined, data: null };
	const version = getPublishedVersion(collection, data.lookup.environment);
	if (version === null) return { error: undefined, data: null };

	try {
		const tablesRes = await getCollectionTableNames(
			context,
			REDIRECTS_COLLECTION_KEY,
		);
		if (tablesRes.error) return tablesRes;
		const tables = tablesRes.data;
		const column = (key: string) => sql.ref(`f.${prefixGeneratedColName(key)}`);
		const versions = sql<
			LucidDB[CollectionTableNames["version"]]
		>`${sql.table(tables.version)}`;
		const fields = sql<
			LucidDB[CollectionTableNames["documentFields"]]
		>`${sql.table(tables.documentFields)}`;

		const redirectsQuery = context.db.kysely
			.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
			.innerJoin(versions.as("v"), "v.document_id", "d.id")
			.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
			.select([
				"v.id as version_id",
				sql<string | null>`${column(redirectFields.targetType)}`.as(
					"target_type",
				),
				sql<string | null>`${column(redirectFields.targetUrl)}`.as(
					"target_url",
				),
				sql<string | null>`${column(redirectFields.statusCode)}`.as(
					"status_code",
				),
				data.config.hasLocaleField
					? sql<string | null>`${column(redirectFields.locale)}`.as(
							"redirect_locale",
						)
					: sql<null>`null`.as("redirect_locale"),
			])
			.where("d.collection_key", "=", REDIRECTS_COLLECTION_KEY)
			.where(
				"d.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.where("v.type", "=", version)
			.where(
				sql<string>`lower(${column(redirectFields.from)})`,
				"=",
				data.path,
			);

		const redirectsRes = await context.db
			.query("pages.redirects.stored.find", () => redirectsQuery)
			.many({
				schema: z.object({
					version_id: z.number(),
					target_type: z.string().nullable(),
					target_url: z.string().nullable(),
					status_code: z.string().nullable(),
					redirect_locale: z.string().nullable(),
				}),
			});
		if (redirectsRes.error) return redirectsRes;

		const redirects = redirectsRes.data.toSorted(
			(a, b) =>
				Number(b.redirect_locale === data.lookup.locale) -
				Number(a.redirect_locale === data.lookup.locale),
		);

		const relationTableRes = buildTableName<LucidBrickTableName>(
			"cf_relation",
			{
				collection: REDIRECTS_COLLECTION_KEY,
				fieldPath: [redirectFields.targetDocument],
			},
			context.config.db.config.tableNameByteLimit,
		);
		if (relationTableRes.error) return relationTableRes;
		const relationTable = relationTableRes.data.name;

		for (const redirect of redirects) {
			const status = statuses[redirect.status_code ?? "301"] ?? 301;

			if (redirect.target_type === redirectTargetTypes.url) {
				//* a redirect back to its own path would send visitors round in circles
				if (
					!redirect.target_url ||
					redirectTargetPath(redirect.target_url) === data.path
				) {
					continue;
				}
				return {
					error: undefined,
					data: { location: redirect.target_url, status },
				};
			}
			if (redirect.target_type !== redirectTargetTypes.document) continue;

			const targetQuery = context.db.kysely
				.selectFrom(relationTable)
				.select([
					`${relationTable}.${prefixGeneratedColName("collection_key")} as collection_key`,
					`${relationTable}.${prefixGeneratedColName("document_id")} as document_id`,
				])
				.where(`${relationTable}.document_version_id`, "=", redirect.version_id)
				.where(`${relationTable}.locale`, "is", null)
				.where(`${relationTable}.position`, "=", 0)
				.limit(1);
			const targetRes = await context.db
				.query("pages.redirects.target.find", () => targetQuery)
				.first({
					schema: z.object({
						collection_key: z.string(),
						document_id: z.number(),
					}),
				});
			if (targetRes.error) return targetRes;
			const target = targetRes.data;
			const targetCollection = target
				? data.config.collections.find(
						(collection) => collection.key === target.collection_key,
					)
				: undefined;
			if (!target || !targetCollection) continue;

			const pathRes = await findCurrentPath(context, {
				collectionKey: target.collection_key,
				documentId: target.document_id,
				environment: data.lookup.environment,
				locale: redirect.redirect_locale ?? data.lookup.locale,
				localized: targetCollection.localized,
			});
			if (pathRes.error) return pathRes;
			if (!pathRes.data) continue;

			return { error: undefined, data: { location: pathRes.data, status } };
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

export default findStoredRedirect;
