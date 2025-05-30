import T from "../translations/index.js";
import constants from "../constants.js";
import { prefixGeneratedColName } from "@lucidcms/core/helpers";
import type {
	ServiceFn,
	DocumentVersionType,
	LucidVersionTableName,
	LucidBrickTableName,
} from "@lucidcms/core/types";

/**
 *  Update the fullSlug fields with the computed value
 */
const updateFullSlugFields: ServiceFn<
	[
		{
			docFullSlugs: Array<{
				documentId: number;
				versionId: number;
				fullSlugs: Record<string, string | null>;
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

		const updateFullSlugsPromises = [];

		for (const doc of data.docFullSlugs) {
			for (const [locale, fullSlug] of Object.entries(doc.fullSlugs)) {
				updateFullSlugsPromises.push(
					context.db
						.updateTable(fieldsTable)
						.set({ [fullSlugColumn]: fullSlug })
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

		await Promise.all(updateFullSlugsPromises);

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("an_unknown_error_occurred_updating_fullslug_fields"),
			},
			data: undefined,
		};
	}
};

export default updateFullSlugFields;
