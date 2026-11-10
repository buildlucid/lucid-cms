import { copy, z } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	DocumentVersionType,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import { REDIRECTS_COLLECTION_KEY, redirectFields } from "../../constants.js";
import type { RedirectIdentity } from "../../types/types.js";

/** Ensures one active redirect owns a source path in a version and locale. */
const checkRedirectUniqueness: ServiceFn<
	[
		{
			identity: RedirectIdentity;
			versionType: Exclude<DocumentVersionType, "revision">;
			documentId: number;
			tables: CollectionTableNames;
			hasLocaleField: boolean;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const column = (key: string) => sql.ref(`f.${prefixGeneratedColName(key)}`);
		const versions = sql<
			LucidDB[CollectionTableNames["version"]]
		>`${sql.table(data.tables.version)}`;
		const fields = sql<
			LucidDB[CollectionTableNames["documentFields"]]
		>`${sql.table(data.tables.documentFields)}`;

		let conflictQuery = context.db.kysely
			.selectFrom(context.db.kysely.dynamic.table(data.tables.document).as("d"))
			.innerJoin(versions.as("v"), "v.document_id", "d.id")
			.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
			.select("d.id")
			.where("d.collection_key", "=", REDIRECTS_COLLECTION_KEY)
			.where(
				"d.is_deleted",
				"=",
				context.config.db.getDefault("boolean", "false"),
			)
			.where("d.id", "!=", data.documentId)
			.where("v.type", "=", data.versionType)
			.where(
				sql<string>`${column(redirectFields.from)}`,
				"=",
				data.identity.from,
			)
			.limit(1);
		if (data.hasLocaleField) {
			conflictQuery = conflictQuery.where(
				sql<string>`${column(redirectFields.locale)}`,
				"=",
				data.identity.locale,
			);
		}

		const conflictRes = await context.db
			.query("pages.redirects.source.unique", () => conflictQuery)
			.first({ schema: z.object({ id: z.number() }) });
		if (conflictRes.error) return conflictRes;
		if (conflictRes.data === undefined) {
			return { error: undefined, data: undefined };
		}

		const message = copy("server:plugin.pages.redirects.source.duplicate");
		return {
			error: {
				type: "basic",
				status: 400,
				message,
				errors: {
					fields: [{ key: redirectFields.from, localeCode: null, message }],
				},
			},
			data: undefined,
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

export default checkRedirectUniqueness;
