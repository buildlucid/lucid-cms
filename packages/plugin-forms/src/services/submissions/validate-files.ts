import { uploads } from "../../constants.js";
import readAccept from "../../shared/read-accept.js";
import readNumber from "../../shared/read-number.js";
import type { FormSettings, FormField } from "../../types.js";
import resolveMaxBytes from "./resolve-max-bytes.js";
import type { FieldErrors } from "./types.js";

/** A file field's files, once they passed its checks. */
export type AcceptedFiles = { field: FormField; files: File[] };

const extensionOf = (fileName: string) => {
	const dot = fileName.lastIndexOf(".");
	return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
};

/**
 * Validates file counts, allowed extensions and size before storage. Drops files posted to non-
 * file fields; accepts only explicitly allowed extensions.
 */
const validateFiles = (
	form: FormSettings,
	input: Record<string, File[]>,
	uploadBytes: number,
): { accepted: AcceptedFiles[]; errors: FieldErrors } => {
	const accepted: AcceptedFiles[] = [];
	const errors: FieldErrors = {};

	for (const formField of form.fields) {
		if (formField.control !== "file") continue;

		//* an empty file input still posts one file, with no name and no bytes
		const files = (input[formField.name] ?? []).filter(
			(file) => file.size > 0 || file.name.trim() !== "",
		);
		if (files.length === 0) {
			if (formField.required) {
				errors[formField.name] = {
					code: "required",
					message: "Choose a file.",
				};
			}
			continue;
		}

		const maxFiles = Math.max(
			1,
			readNumber(formField.settings, "maxFiles") ?? uploads.maxFiles,
		);
		if (files.length > maxFiles) {
			errors[formField.name] = {
				code: "too_many",
				message:
					maxFiles === 1
						? "Choose one file."
						: `Choose ${maxFiles} files or fewer.`,
			};
			continue;
		}

		if (files.some((file) => file.size === 0)) {
			errors[formField.name] = {
				code: "file_empty",
				message: "Choose a file that isn't empty.",
			};
			continue;
		}

		const accept = readAccept(formField.settings);
		if (files.some((file) => !accept.includes(extensionOf(file.name)))) {
			errors[formField.name] = {
				code: "file_type",
				message: `Choose a file of one of these types: ${accept.join(", ")}.`,
			};
			continue;
		}

		const maxBytes = resolveMaxBytes(formField, uploadBytes);
		if (files.some((file) => file.size > maxBytes)) {
			errors[formField.name] = {
				code: "file_size",
				message: `Choose a file smaller than ${Math.floor(maxBytes / uploads.bytesPerMb) || 1} MB.`,
			};
			continue;
		}

		accepted.push({ field: formField, files });
	}

	return { accepted, errors };
};

export default validateFiles;
