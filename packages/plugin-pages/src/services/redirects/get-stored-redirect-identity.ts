import { copy, z } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import { redirectFields, redirectTargetTypes } from "../../constants.js";
import type { RedirectIdentity } from "../../types/types.js";

/** Reads a stored redirect version's source, locale and target, or null when it is incomplete. */
const getStoredRedirectIdentity: ServiceFn<
	[
		{
			versionId: number;
			tables: CollectionTableNames;
			hasLocaleField: boolean;
			defaultLocale: string | null;
		},
	],
	RedirectIdentity | null
> = async (context, data) => {
	try {
		const column = (key: string) => sql.ref(`f.${prefixGeneratedColName(key)}`);
		const fields = sql<
			LucidDB[CollectionTableNames["documentFields"]]
		>`${sql.table(data.tables.documentFields)}`;

		const identityQuery = context.db.kysely
			.selectFrom(fields.as("f"))
			.select([
				sql<string | null>`${column(redirectFields.from)}`.as("source_path"),
				sql<string | null>`${column(redirectFields.targetType)}`.as(
					"target_type",
				),
				sql<string | null>`${column(redirectFields.targetUrl)}`.as(
					"target_url",
				),
				data.hasLocaleField
					? sql<string | null>`${column(redirectFields.locale)}`.as(
							"redirect_locale",
						)
					: sql<null>`null`.as("redirect_locale"),
			])
			.where("f.document_version_id", "=", data.versionId)
			.limit(1);

		const identityRes = await context.db
			.query("pages.redirects.identity.find", () => identityQuery)
			.first({
				schema: z.object({
					source_path: z.string().nullable(),
					target_type: z.string().nullable(),
					target_url: z.string().nullable(),
					redirect_locale: z.string().nullable(),
				}),
			});
		if (identityRes.error) return identityRes;

		const row = identityRes.data;
		if (
			!row?.source_path ||
			(row.target_type !== redirectTargetTypes.document &&
				row.target_type !== redirectTargetTypes.url)
		) {
			return { error: undefined, data: null };
		}

		return {
			error: undefined,
			data: {
				from: row.source_path,
				locale: row.redirect_locale ?? data.defaultLocale,
				targetType: row.target_type,
				targetUrl:
					row.target_type === redirectTargetTypes.url ? row.target_url : null,
			},
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.redirects.source.check.failed"),
			},
			data: undefined,
		};
	}
};

export default getStoredRedirectIdentity;
