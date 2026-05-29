import { expect, test } from "vitest";
import { copy } from "../../../../i18n/index.js";
import CustomFieldSchema from "../../schema.js";
import RepeaterCustomField from "./custom-field.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RepeaterCustomField("field", {
		details: {
			label: copy("admin:tests.fields.field.label", {
				defaultMessage: "title",
			}),
			summary: copy("admin:tests.fields.field.summary", {
				defaultMessage: "description",
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
