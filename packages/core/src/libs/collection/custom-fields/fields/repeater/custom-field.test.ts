import { expect, test } from "vitest";
import { adminText } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import RepeaterCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RepeaterCustomField("field", {
		details: {
			label: adminText("tests.fields.field.label", {
				fallback: "title",
			}),
			summary: adminText("tests.fields.field.summary", {
				fallback: "description",
			}),
		},
		config: {
			disabled: false,
		},
		validation: {
			maxGroups: 3,
			minGroups: 1,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});
