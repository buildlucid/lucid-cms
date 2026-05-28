import { expect, test } from "vitest";
import { adminText } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import TabCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TabCustomField("field", {
		details: {
			label: adminText("tests.fields.field.label", {
				fallback: "title",
			}),
			summary: adminText("tests.fields.field.summary", {
				fallback: "description",
			}),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});
