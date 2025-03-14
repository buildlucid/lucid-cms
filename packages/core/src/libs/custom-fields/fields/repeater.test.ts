import { expect, test } from "vitest";
import CustomFieldSchema from "../schema.js";
import RepeaterCustomField from "./repeater.js";

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new RepeaterCustomField("field", {
		details: {
			label: {
				en: "title",
			},
			summary: {
				en: "description",
			},
		},
		config: {
			isDisabled: false,
		},
		validation: {
			maxGroups: 3,
			minGroups: 1,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});
