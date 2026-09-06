import { copy } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../constants.js";
import getCollectionDefaultLocale from "../utils/get-collection-default-locale.js";
import normalizePathValue from "../utils/normalize-path-value.js";

/**
 *  Update the slug fields with the computed value
 */
const updateSlugFields: ServiceFn<
	[
		{
			collectionKey: string;
			docSlugs: Array<{
				documentId: number;
				versionId: number;
				slugs: Map<string | null, string | null>;
			}>;
			versionType: Exclude<DocumentVersionType, "revision">;
			tables: {
				documentFields: LucidBrickTableName;
				version: LucidVersionTableName;
			};
		},
	],
	undefined
> = async (context, data) => {
	try {
		const { documentFields: fieldsTable, version: versionTable } = data.tables;
		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);

		const defaultLocale = getCollectionDefaultLocale(
			context.config,
			data.collectionKey,
		);
		const updateSlugsPromises = [];

		for (const doc of data.docSlugs) {
			for (const [locale, slug] of doc.slugs) {
				updateSlugsPromises.push(
					context.db
						.query("pages.slug.update", (db) =>
							db
								.updateTable(fieldsTable)
								.set({ [slugColumn]: normalizePathValue(slug) })
								.where((eb) =>
									eb.exists(
										eb
											.selectFrom(versionTable)
											.selectAll()
											.where(`${versionTable}.id`, "=", doc.versionId)
											.where(`${versionTable}.document_id`, "=", doc.documentId)
											.where(`${versionTable}.type`, "=", data.versionType),
									),
								)
								.where("document_version_id", "=", doc.versionId)
								.where((eb) =>
									locale === null
										? eb("locale", "is", null)
										: locale !== defaultLocale
											? eb("locale", "=", locale)
											: eb.or([
													eb("locale", "=", locale),
													eb.and([
														eb("locale", "is", null),
														sql<boolean>`not exists (select 1 from ${sql.table(fieldsTable)} as assigned_fields where assigned_fields.document_version_id = ${doc.versionId} and assigned_fields.locale = ${locale})`,
													]),
												]),
								),
						)
						.many(),
				);
			}
		}

		const updateResults = await Promise.all(updateSlugsPromises);
		const failedUpdate = updateResults.find((result) => result.error);
		if (failedUpdate?.error) {
			return { error: failedUpdate.error, data: undefined };
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
				message: copy("server:plugin.pages.full.slug.children.update.failed"),
			},
			data: undefined,
		};
	}
};

export default updateSlugFields;
