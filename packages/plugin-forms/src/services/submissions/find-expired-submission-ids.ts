import { z } from "@lucidcms/core";
import {
	getCollectionTableNames,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	LucidDB,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import {
	DAY_MS,
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
	submissions,
} from "../../constants.js";
import parseTimestamp from "./parse-timestamp.js";

const rowSchema = z.object({ id: z.number(), created_at: z.unknown() });

/** Which forms' submissions to look at: one form's, or those of every form but the ones named. */
export type SubmissionFormMatch = { is: string } | { not: string[] };

/** A page of submissions, in ID order. */
export type ExpiredSubmissionsPage = {
	/** The page's submissions that were sent before the cutoff. */
	ids: number[];
	/** Where the next page starts after, or null when this was the last one. */
	next: number | null;
};

/**
 * Reads the next page of the matching forms' submissions after `afterId`, binned ones included,
 * as a binned submission still holds its answers and files. Read from the tables, since content
 * reads leave binned documents out. Databases store dates in different formats, so the query only
 * narrows to submissions sent before the day after the cutoff, which holds in each format, and
 * the exact check is made here.
 */
const findExpiredSubmissionIds: ServiceFn<
	[{ form: SubmissionFormMatch; before: number; afterId: number }],
	ExpiredSubmissionsPage
> = async (context, data) => {
	const tablesRes = await getCollectionTableNames(
		context,
		SUBMISSIONS_COLLECTION_KEY,
	);
	if (tablesRes.error) return tablesRes;
	const tables = tablesRes.data;

	const versions = sql<
		LucidDB[CollectionTableNames["version"]]
	>`${sql.table(tables.version)}`;
	const fields = sql<
		LucidDB[CollectionTableNames["documentFields"]]
	>`${sql.table(tables.documentFields)}`;
	const form = sql<
		string | null
	>`${sql.ref(`f.${prefixGeneratedColName(submissionFields.form)}`)}`;
	const { form: match } = data;

	let query = context.db.kysely
		.selectFrom(context.db.kysely.dynamic.table(tables.document).as("d"))
		.innerJoin(versions.as("v"), "v.document_id", "d.id")
		.innerJoin(fields.as("f"), "f.document_version_id", "v.id")
		.select(["d.id", "d.created_at"])
		.where("d.collection_key", "=", SUBMISSIONS_COLLECTION_KEY)
		.where("d.id", ">", data.afterId)
		.where("d.created_at", "<", new Date(data.before + DAY_MS).toISOString())
		.where("v.type", "=", "latest")
		.where("f.locale", "is", null)
		.orderBy("d.id")
		.limit(submissions.pageSize);
	if ("is" in match) {
		query = query.where(form, "=", match.is);
	} else if (match.not.length > 0) {
		//* a submission whose form was cleared belongs to no known form. With no forms to leave out, every submission matches
		const known = match.not;
		query = query.where((eb) =>
			eb.or([eb(form, "is", null), eb(form, "not in", known)]),
		);
	}
	const rows = await context.db
		.query("forms.submissions.expired", () => query)
		.many({ schema: rowSchema });
	if (rows.error) return rows;

	//* a submission without a date is left alone, as its age isn't known
	const ids = rows.data.flatMap((row) => {
		const sent = parseTimestamp(row.created_at);
		return sent !== null && sent < data.before ? [row.id] : [];
	});

	return {
		error: undefined,
		data: {
			ids,
			next:
				rows.data.length < submissions.pageSize
					? null
					: (rows.data.at(-1)?.id ?? null),
		},
	};
};

export default findExpiredSubmissionIds;
