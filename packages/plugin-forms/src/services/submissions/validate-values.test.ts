import { describe, expect, test } from "vitest";
import { defineForm, formField } from "../../index.js";
import parsePluginOptions from "../parse-plugin-options.js";
import validateValues from "./validate-values.js";

const options = parsePluginOptions({
	definitions: [
		defineForm({
			key: "signup",
			fields: [
				formField.text("name", { required: true, maxLength: 5 }),
				formField.number("age", { min: 18, step: 2 }),
				formField.checkboxes("interests", {
					options: [
						{ label: "News", value: "news" },
						{ label: "Events", value: "events" },
					],
				}),
				formField.checkbox("terms", { required: true }),
				formField.date("starts"),
				formField.url("site"),
			],
		}),
	],
});
const [form] = options.forms;
if (!form) throw new Error("The form wasn't resolved.");

const validate = (input: Record<string, unknown>) =>
	validateValues(form, options.fieldTypes, input);

describe("validateValues", () => {
	test("reads a posted form's text as the types its fields ask for", () => {
		const { values, errors } = validate({
			name: " Ada ",
			age: "42",
			interests: "news",
			terms: "on",
			starts: "2026-12-01",
			site: "https://example.com",
			extra: "dropped",
		});

		expect(errors).toEqual({});
		expect(values).toEqual({
			name: "Ada",
			age: 42,
			interests: ["news"],
			terms: true,
			starts: "2026-12-01",
			site: "https://example.com",
		});
	});

	test("stores answers left out as null, unless their field is required", () => {
		const { values, errors } = validate({ name: "", terms: "off" });

		expect(errors).toEqual({
			name: { code: "required", message: "This field is required." },
			terms: { code: "required", message: "This field is required." },
		});
		expect(values).toEqual({
			age: null,
			interests: null,
			starts: null,
			site: null,
		});
	});

	test("refuses answers outside a field's limits, choices or format", () => {
		const { errors } = validate({
			name: "Too long",
			age: "17",
			interests: ["news", "sport"],
			terms: true,
			starts: "tomorrow",
			site: "javascript:alert(1)",
		});

		//* each says why, for scripts that word errors themselves
		expect(
			Object.fromEntries(
				Object.entries(errors).map(([name, error]) => [name, error.code]),
			),
		).toEqual({
			name: "too_long",
			age: "too_small",
			interests: "not_an_option",
			starts: "format",
			site: "format",
		});
		expect(errors.age?.message).toBe("Enter 18 or more.");
		//* steps count from the minimum, as the browser's own check does
		expect(validate({ name: "Ada", terms: true, age: 21 }).errors.age).toEqual({
			code: "step",
			message: "Enter a number in steps of 2.",
		});
	});
});
