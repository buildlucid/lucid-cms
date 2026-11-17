import { copy, z } from "@lucidcms/core";
import { prefixGeneratedColName } from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import { FORMS_COLLECTION_KEY, formFields } from "../../constants.js";

/** Ensures one form owns a key in a version, so the key always reads the same form. */
const checkKeyUniqueness: ServiceFn<
	[
		{
			key: string;
			versionType: string;
			documentId: number;
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	const versions = sql<
		LucidDB[CollectionTableNames["version"]]
	>`${sql.table(data.tables.version)}`;
	const fields = sql<
		LucidDB[CollectionTableNames["documentFields"]]
	>`${sql.table(data.tables.documentFields)}`;

	const conflictQuery = context.db.kysely
		.selectFrom(context.db.kysely.dynamic.table(data.tables.document).as("d"))
		.innerJoin(versions.as("v"), "v.document_id", "d.id")
		.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
		.select("d.id")
		.where("d.collection_key", "=", FORMS_COLLECTION_KEY)
		.where(
			"d.is_deleted",
			"=",
			context.config.db.getDefault("boolean", "false"),
		)
		.where("d.id", "!=", data.documentId)
		.where("v.type", "=", data.versionType)
		.where(
			sql<string>`${sql.ref(`f.${prefixGeneratedColName(formFields.key)}`)}`,
			"=",
			data.key,
		)
		.limit(1);
	const conflictRes = await context.db
		.query("forms.key.unique", () => conflictQuery)
		.first({ schema: z.object({ id: z.number() }) });
	if (conflictRes.error) return conflictRes;
	if (conflictRes.data === undefined) {
		return { error: undefined, data: undefined };
	}

	const message = copy("server:plugin.forms.key.duplicate");
	return {
		error: {
			type: "basic",
			status: 400,
			message,
			errors: {
				fields: [{ key: formFields.key, localeCode: null, message }],
			},
		},
		data: undefined,
	};
};

export default checkKeyUniqueness;
