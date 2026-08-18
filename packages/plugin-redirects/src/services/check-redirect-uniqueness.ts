import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	ServiceFn,
} from "@lucidcms/core/types";
import { COLLECTION_KEY, fields } from "../constants.js";
import type { RedirectIdentity } from "../utils/redirect-input.js";

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
		const fromColumn = prefixGeneratedColName(fields.from);
		const localeColumn = prefixGeneratedColName(fields.locale);

		const conflictRes = await context.db
			.query("redirects.unique-source.find", (db) => {
				let query = db
					.selectFrom(data.tables.document)
					.innerJoin(
						data.tables.version,
						// @ts-expect-error Generated table names are resolved at runtime.
						`${data.tables.version}.document_id`,
						`${data.tables.document}.id`,
					)
					.innerJoin(
						data.tables.documentFields,
						// @ts-expect-error Generated table names are resolved at runtime.
						`${data.tables.documentFields}.document_version_id`,
						`${data.tables.version}.id`,
					)
					// @ts-expect-error Generated table names are resolved at runtime.
					.select(`${data.tables.document}.id`)
					.where(`${data.tables.document}.collection_key`, "=", COLLECTION_KEY)
					.where(
						`${data.tables.document}.is_deleted`,
						"=",
						context.config.db.getDefault("boolean", "false"),
					)
					.where(`${data.tables.document}.id`, "!=", data.documentId)
					.where(`${data.tables.version}.type`, "=", data.versionType)
					.where(
						`${data.tables.documentFields}.${fromColumn}`,
						"=",
						data.identity.from,
					);

				if (data.hasLocaleField) {
					query = query.where(
						`${data.tables.documentFields}.${localeColumn}`,
						"=",
						data.identity.locale,
					);
				}

				return query.limit(1);
			})
			.first();
		if (conflictRes.error) return conflictRes;

		if (conflictRes.data === undefined) {
			return { error: undefined, data: undefined };
		}

		const message = copy("server:plugin.redirects.source.duplicate", {
			defaultMessage:
				"Another redirect already uses this starting path for the selected language.",
		});

		return {
			error: {
				type: "basic",
				status: 400,
				message,
				errors: {
					fields: [
						{
							key: fields.from,
							localeCode: null,
							message,
						},
					],
				},
			},
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.redirects.source.check.failed", {
					defaultMessage: "The redirect source could not be checked.",
				}),
				cause: error,
			},
			data: undefined,
		};
	}
};

export default checkRedirectUniqueness;
