import { prefixGeneratedColName, text } from "@lucidcms/core/plugin";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import constants from "../constants.js";
import normalizePathValue from "../utils/normalize-path-value.js";

/**
 *  Update the slug fields with the computed value
 */
const updateSlugFields: ServiceFn<
	[
		{
			docSlugs: Array<{
				documentId: number;
				versionId: number;
				slugs: Record<string, string | null>;
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

		const updateSlugsPromises = [];

		for (const doc of data.docSlugs) {
			for (const [locale, slug] of Object.entries(doc.slugs)) {
				updateSlugsPromises.push(
					context.db.client
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
						.where("locale", "=", locale)
						.execute(),
				);
			}
		}

		await Promise.all(updateSlugsPromises);

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: text.server("plugin.pages.full.slug.children.update.failed"),
			},
			data: undefined,
		};
	}
};

export default updateSlugFields;
