import { z } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import {
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
} from "../../constants.js";
import readSubmissionValues from "../../shared/read-submission-values.js";
import stringifyValue from "../../shared/stringify-value.js";
import toCsv from "./to-csv.js";

const documentSchema = z.object({
	fields: z.record(z.string(), z.unknown()),
	meta: z.object({ createdAt: z.string().nullable() }).optional(),
});

/**
 * Writes every stored submission of a form as CSV, oldest first: when it was sent, its status,
 * then a column per field. Columns follow the fields as they were when each submission was sent,
 * so fields the form has since lost keep their answers.
 */
const exportSubmissions: ServiceFn<[{ form: string }], string> = async (
	context,
	data,
) => {
	const toolkit = createToolkit(context);
	const columns = new Map<string, string>();
	const rows: Array<{
		createdAt: string;
		status: string;
		answers: Record<string, string>;
	}> = [];

	//* one read, as pages of rows sent in the same moment have no settled order between them
	const listed = await toolkit.documents.getMultiple({
		collectionKey: SUBMISSIONS_COLLECTION_KEY,
		version: "latest",
		filter: { fields: { [submissionFields.form]: data.form } },
		sort: [{ key: "createdAt", direction: "asc" }],
		include: ["meta"],
		depth: 0,
		perPage: -1,
	});
	if (listed.error) return listed;

	for (const item of listed.data.items) {
		const document = documentSchema.parse(item);
		const values = readSubmissionValues(
			document.fields[submissionFields.values],
		);
		if (values === null) continue;

		const answers: Record<string, string> = {};
		for (const snapshot of values.fields) {
			columns.set(snapshot.name, snapshot.label);
			answers[snapshot.name] =
				snapshot.control === "file"
					? values.files
							.filter((file) => file.field === snapshot.name)
							.map((file) => file.fileName)
							.join(", ")
					: stringifyValue(values.data[snapshot.name]);
		}
		const status = document.fields[submissionFields.status];
		rows.push({
			createdAt: document.meta?.createdAt ?? "",
			status: typeof status === "string" ? status : "",
			answers,
		});
	}

	const names = [...columns.keys()];
	return {
		error: undefined,
		data: toCsv([
			["Sent", "Status", ...names.map((name) => columns.get(name) ?? name)],
			...rows.map((row) => [
				row.createdAt,
				row.status,
				...names.map((name) => row.answers[name] ?? ""),
			]),
		]),
	};
};

export default exportSubmissions;
