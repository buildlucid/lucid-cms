import { expect, test } from "vitest";
import { copy } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import TabCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new TabCustomField("field", {
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
