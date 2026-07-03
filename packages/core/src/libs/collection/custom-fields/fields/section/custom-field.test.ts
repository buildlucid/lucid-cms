import { expect, test } from "vitest";
import { copy } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import SectionCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new SectionCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "description",
			}),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("output defaults to nested and accepts inline", async () => {
	const defaultField = new SectionCustomField("field");
	expect(defaultField.config.output).toBe("nested");

	const inlineField = new SectionCustomField("field", {
		output: "inline",
	});
	expect(inlineField.config.output).toBe("inline");

	const res = await CustomFieldSchema.safeParseAsync(inlineField.config);
	expect(res.success).toBe(true);
});

test("invalid output fails schema validation", async () => {
	const field = new SectionCustomField("field");

	const res = await CustomFieldSchema.safeParseAsync({
		...field.config,
		output: "flattened",
	});
	expect(res.success).toBe(false);
});

// -----------------------------------------------
// Width
test("supported ui widths pass schema validation", async () => {
	for (const width of [12, 8, 6, 4, 3] as const) {
		const field = new SectionCustomField("field", {
			ui: { width },
		});
		expect(field.config.ui?.width).toBe(width);

		const res = await CustomFieldSchema.safeParseAsync(field.config);
		expect(res.success).toBe(true);
	}
});

test("unsupported ui widths fail schema validation", async () => {
	const field = new SectionCustomField("field");

	const res = await CustomFieldSchema.safeParseAsync({
		...field.config,
		ui: { width: 5 },
	});
	expect(res.success).toBe(false);
});
