import type { FormValue, SubmissionValues } from "../types.js";
import isRecord from "./is-record.js";

const isFormValue = (value: unknown): value is FormValue =>
	value === null ||
	typeof value === "string" ||
	typeof value === "number" ||
	typeof value === "boolean" ||
	(Array.isArray(value) && value.every((item) => typeof item === "string"));

/**
 * Reads a stored submission's `values` field, or null when it isn't what the form wrote. Checked
 * by hand rather than with a schema, as the admin reads it too and can't load the server's.
 */
const readSubmissionValues = (value: unknown): SubmissionValues | null => {
	if (!isRecord(value)) return null;
	const { data, fields, files } = value;
	if (!isRecord(data) || !Array.isArray(fields) || !Array.isArray(files)) {
		return null;
	}

	const answers: SubmissionValues["data"] = {};
	for (const [name, answer] of Object.entries(data)) {
		if (!isFormValue(answer)) return null;
		answers[name] = answer;
	}

	const snapshots: SubmissionValues["fields"] = [];
	for (const field of fields) {
		if (
			!isRecord(field) ||
			typeof field.name !== "string" ||
			typeof field.label !== "string" ||
			typeof field.type !== "string" ||
			typeof field.control !== "string"
		) {
			return null;
		}
		snapshots.push({
			name: field.name,
			label: field.label,
			type: field.type,
			control: field.control as SubmissionValues["fields"][number]["control"],
		});
	}

	const stored: SubmissionValues["files"] = [];
	for (const file of files) {
		if (
			!isRecord(file) ||
			typeof file.field !== "string" ||
			typeof file.mediaId !== "number" ||
			typeof file.fileName !== "string" ||
			typeof file.public !== "boolean"
		) {
			return null;
		}
		stored.push({
			field: file.field,
			mediaId: file.mediaId,
			fileName: file.fileName,
			public: file.public,
		});
	}

	return { data: answers, fields: snapshots, files: stored };
};

export default readSubmissionValues;
