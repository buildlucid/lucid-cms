import { copy, field, z } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import readNumber from "../shared/read-number.js";

/** A number, within the field's `min` and `max` and on its `step` when they are set. */
export default defineFormFieldType({
	key: "number",
	label: copy("admin:plugin.forms.field.number.label"),
	control: "number",
	settings: [
		field.number("min", {
			details: { label: copy("admin:plugin.forms.settings.min.label") },
			ui: { width: 4 },
		}),
		field.number("max", {
			details: { label: copy("admin:plugin.forms.settings.max.label") },
			ui: { width: 4 },
		}),
		field.number("step", {
			details: { label: copy("admin:plugin.forms.settings.step.label") },
			ui: { width: 4 },
		}),
	],
	schema: (formField) => {
		const min = readNumber(formField.settings, "min");
		const max = readNumber(formField.settings, "max");
		let number = z.number("Enter a number.");
		if (min !== undefined) {
			number = number.min(min, `Enter ${min} or more.`);
		}
		if (max !== undefined) {
			number = number.max(max, `Enter ${max} or less.`);
		}
		const step = readNumber(formField.settings, "step");
		if (step !== undefined && step > 0) {
			//* counted as browsers count them: from the minimum, or else the default value, or else zero
			const start = Number(formField.defaultValue ?? "");
			const base =
				min ?? (formField.defaultValue && Number.isFinite(start) ? start : 0);
			number = number.refine(
				(value) => {
					const steps = (value - base) / step;
					//* decimal steps don't divide exactly, by an amount that grows with the number
					const tolerance = Math.max(
						1e-9,
						Math.abs(steps) * Number.EPSILON * 16,
					);
					return Math.abs(steps - Math.round(steps)) < tolerance;
				},
				{
					error: `Enter a number in steps of ${step}.`,
					params: { code: "step" },
				},
			);
		}

		//* forms post numbers as text
		return z.preprocess(
			(value) =>
				typeof value === "string" && value.trim() !== ""
					? Number(value)
					: value,
			number,
		);
	},
});
