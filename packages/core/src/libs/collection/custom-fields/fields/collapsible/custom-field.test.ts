import { expect, test } from "vitest";
import { copy } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import CollapsibleCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new CollapsibleCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "description",
			}),
		},
		defaultOpen: true,
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("output defaults to nested and accepts inline", async () => {
	const defaultField = new CollapsibleCustomField("field");
	expect(defaultField.config.output).toBe("nested");

	const inlineField = new CollapsibleCustomField("field", {
		output: "inline",
	});
	expect(inlineField.config.output).toBe("inline");

	const res = await CustomFieldSchema.safeParseAsync(inlineField.config);
	expect(res.success).toBe(true);
});

test("defaultOpen defaults to false", async () => {
	const field = new CollapsibleCustomField("field");
	expect(field.config.defaultOpen).toBe(false);
});

// -----------------------------------------------
// Width
test("supported ui widths pass schema validation", async () => {
	const field = new CollapsibleCustomField("field", {
		ui: { width: 6 },
	});
	expect(field.config.ui?.width).toBe(6);

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});

test("unsupported ui widths fail schema validation", async () => {
	const field = new CollapsibleCustomField("field");

	const res = await CustomFieldSchema.safeParseAsync({
		...field.config,
		ui: { width: 7 },
	});
	expect(res.success).toBe(false);
});
