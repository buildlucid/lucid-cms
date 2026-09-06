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
 *  Update the fullSlug fields with the computed value
 */
const updateFullSlugFields: ServiceFn<
	[
		{
			collectionKey: string;
			docFullSlugs: Array<{
				documentId: number;
				versionId: number;
				fullSlugs: Map<string | null, string | null>;
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
		const fullSlugColumn = prefixGeneratedColName(
			constants.fields.fullSlug.key,
		);

		const defaultLocale = getCollectionDefaultLocale(
			context.config,
			data.collectionKey,
		);
		const updateFullSlugsPromises = [];

		for (const doc of data.docFullSlugs) {
			for (const [locale, fullSlug] of doc.fullSlugs) {
				updateFullSlugsPromises.push(
					context.db
						.query("pages.full-slug.update", (db) =>
							db
								.updateTable(fieldsTable)
								.set({ [fullSlugColumn]: normalizePathValue(fullSlug) })
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

		const updateResults = await Promise.all(updateFullSlugsPromises);
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

export default updateFullSlugFields;
