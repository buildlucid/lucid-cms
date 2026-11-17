import type {
	FormSettings,
	FormFieldTypeDefinition,
	FormValues,
} from "../../types.js";
import isEmpty from "./is-empty.js";
import issueCode from "./issue-code.js";
import type { FieldErrors } from "./types.js";

const REQUIRED = "This field is required.";

/**
 * Validates supplied answers with each field's schema. Missing answers fail when required,
 * otherwise become null. Drops unknown fields; validates files separately.
 */
const validateValues = (
	form: FormSettings,
	fieldTypes: Map<string, FormFieldTypeDefinition>,
	input: Record<string, unknown>,
): { values: FormValues; errors: FieldErrors } => {
	const values: FormValues = {};
	const errors: FieldErrors = {};

	for (const formField of form.fields) {
		const type = fieldTypes.get(formField.type);
		if (!type || type.control === "file") continue;

		const raw = input[formField.name];
		if (isEmpty(raw)) {
			if (formField.required) {
				errors[formField.name] = { code: "required", message: REQUIRED };
			} else {
				values[formField.name] = null;
			}
			continue;
		}

		const parsed = type.schema(formField).safeParse(raw);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			errors[formField.name] = {
				code: issueCode(issue),
				message: issue?.message ?? "Check this answer.",
			};
			continue;
		}
		//* an unticked box can still be posted, as false
		if (formField.required && (parsed.data === false || isEmpty(parsed.data))) {
			errors[formField.name] = { code: "required", message: REQUIRED };
			continue;
		}

		values[formField.name] = parsed.data;
	}

	return { values, errors };
};

export default validateValues;
