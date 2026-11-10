import { copy } from "@lucidcms/core";
import {
	getCollectionTableNames,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../../constants.js";
import type { RedirectTargetCollection } from "../../types/types.js";
import getCollectionDefaultLocale from "../../utils/get-collection-default-locale.js";
import getPublishedVersion from "../../utils/get-published-version.js";

/**
 * Checks whether a published page owns the path in the requested environment and locale.
 * Unassigned rows supply the default locale only when no explicit row exists.
 */
const findPageAtPath: ServiceFn<
	[
		{
			collections: RedirectTargetCollection[];
			path: string;
			environment: string;
			locale?: string | null;
		},
	],
	boolean
> = async (context, data) => {
	try {
		const pathColumn = prefixGeneratedColName(constants.fields.path.key);

		for (const target of data.collections) {
			const collection = context.config.collections.find(
				(item) => item.key === target.key,
			);
			if (!collection) continue;
			const version = getPublishedVersion(collection, data.environment);
			if (version === null) continue;

			const defaultLocale = getCollectionDefaultLocale(
				context.config,
				target.key,
			);
			const tablesRes = await getCollectionTableNames(context, target.key);
			if (tablesRes.error) return tablesRes;
			const tables = tablesRes.data;
			const versions = sql<
				LucidDB[CollectionTableNames["version"]]
			>`${sql.table(tables.version)}`;
			const fields = sql<
				LucidDB[CollectionTableNames["documentFields"]]
			>`${sql.table(tables.documentFields)}`;

			const query = context.db.kysely
				.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
				.innerJoin(versions.as("v"), "v.document_id", "d.id")
				.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
				.select("d.id")
				.where("v.type", "=", version)
				.where("d.collection_key", "=", target.key)
				.where(
					"d.is_deleted",
					"=",
					context.config.db.getDefault("boolean", "false"),
				)
				.where(
					sql<string>`lower(${sql.ref(`f.${pathColumn}`)})`,
					"=",
					data.path,
				)
				.where((eb) => {
					//* translated rows left from when paths were localized aren't live
					if (!target.localized) return eb("f.locale", "is", null);

					const explicitDefault = eb
						.selectFrom(fields.as("assigned_fields"))
						.select("assigned_fields.id")
						.whereRef("assigned_fields.document_version_id", "=", "v.id")
						.where("assigned_fields.locale", "=", eb.val(defaultLocale));
					const inherited = eb.and([
						eb("f.locale", "is", null),
						eb.not(eb.exists(explicitDefault)),
					]);

					if (typeof data.locale !== "string") {
						return eb.or([eb("f.locale", "is not", null), inherited]);
					}
					return data.locale === defaultLocale
						? eb.or([eb("f.locale", "=", data.locale), inherited])
						: eb("f.locale", "=", data.locale);
				})
				.limit(1);

			const pageRes = await context.db
				.query("pages.redirects.page-at-path.find", () => query)
				.first();
			if (pageRes.error) return pageRes;
			if (pageRes.data !== undefined) return { error: undefined, data: true };
		}

		return { error: undefined, data: false };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.redirects.page.check.failed"),
			},
			data: undefined,
		};
	}
};

export default findPageAtPath;
