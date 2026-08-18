import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/plugin";
import type { CollectionTableNames, ServiceFn } from "@lucidcms/core/types";
import { fields, targetTypes } from "../constants.js";
import type { RedirectIdentity } from "../utils/redirect-input.js";

const getRedirectIdentity: ServiceFn<
	[
		{
			versionId: number;
			tables: CollectionTableNames;
			hasLocaleField: boolean;
			defaultLocale: string;
		},
	],
	RedirectIdentity | null
> = async (context, data) => {
	try {
		const fromColumn = prefixGeneratedColName(fields.from);
		const targetTypeColumn = prefixGeneratedColName(fields.targetType);
		const targetUrlColumn = prefixGeneratedColName(fields.targetUrl);
		const localeColumn = prefixGeneratedColName(fields.locale);

		const result = await context.db
			.query("redirects.version.identity.find", (db) =>
				db
					.selectFrom(data.tables.documentFields)
					.select([
						`${data.tables.documentFields}.${fromColumn} as source_path`,
						`${data.tables.documentFields}.${targetTypeColumn} as target_type`,
						`${data.tables.documentFields}.${targetUrlColumn} as target_url`,
						...(data.hasLocaleField
							? [
									`${data.tables.documentFields}.${localeColumn} as redirect_locale`,
								]
							: []),
					])
					.where(
						`${data.tables.documentFields}.document_version_id`,
						"=",
						data.versionId,
					)
					.limit(1),
			)
			.first();
		if (result.error) return result;
		if (result.data === undefined) {
			return { error: undefined, data: null };
		}

		const row = result.data as unknown as {
			source_path: string | null;
			target_type: string | null;
			target_url: string | null;
			redirect_locale?: string | null;
		};
		if (
			!row.source_path ||
			(row.target_type !== targetTypes.document &&
				row.target_type !== targetTypes.url)
		) {
			return { error: undefined, data: null };
		}

		return {
			error: undefined,
			data: {
				from: row.source_path,
				locale: row.redirect_locale ?? data.defaultLocale,
				targetType: row.target_type,
				targetUrl: row.target_type === targetTypes.url ? row.target_url : null,
			},
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

export default getRedirectIdentity;
