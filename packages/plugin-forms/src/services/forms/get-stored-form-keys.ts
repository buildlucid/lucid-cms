import { z } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import { formFields } from "../../constants.js";

const rowSchema = z.object({
	document_id: z.number(),
	type: z.string(),
	key: z.string().nullable(),
});

/** A form's key as one of its versions stores it. */
export type StoredFormKey = {
	documentId: number;
	versionType: string;
	key: string;
};

/**
 * Reads the key stored in forms' versions: one version by its ID, or documents' versions of the
 * given types. Versions without a key are left out.
 */
const getStoredFormKeys: ServiceFn<
	[
		{
			tables: CollectionTableNames;
			where:
				| { versionId: number }
				| { documentIds: number[]; versionTypes: string[] };
		},
	],
	StoredFormKey[]
> = async (context, data) => {
	const fields = sql<
		LucidDB[CollectionTableNames["documentFields"]]
	>`${sql.table(data.tables.documentFields)}`;

	let query = context.db.kysely
		.selectFrom(context.db.kysely.dynamic.table(data.tables.version).as("v"))
		.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
		.select([
			"v.document_id",
			"v.type",
			sql<
				string | null
			>`${sql.ref(`f.${prefixGeneratedColName(formFields.key)}`)}`.as("key"),
		])
		//* the key isn't translated, so it is on the row every locale shares
		.where("f.locale", "is", null);
	query =
		"versionId" in data.where
			? query.where("v.id", "=", data.where.versionId)
			: query
					.where("v.document_id", "in", data.where.documentIds)
					.where("v.type", "in", data.where.versionTypes);

	const rows = await context.db
		.query("forms.keys.stored", () => query)
		.many({ schema: rowSchema });
	if (rows.error) return rows;

	return {
		error: undefined,
		data: rows.data.flatMap((row) =>
			row.key === null || row.key.trim() === ""
				? []
				: [
						{
							documentId: row.document_id,
							versionType: row.type,
							key: row.key,
						},
					],
		),
	};
};

export default getStoredFormKeys;
