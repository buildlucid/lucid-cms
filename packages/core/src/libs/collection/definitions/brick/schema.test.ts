import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import defineBrick from "../../define-brick.js";
import field from "../fields/field.js";
import BrickConfigSchema from "./schema.js";

test("brick config passes schema validation", async () => {
	const brick = defineBrick({
		key: "block",
		details: {
			label: copy("admin:tests.bricks.block.name", {
				defaultMessage: "Block",
			}),
			description: copy("admin:tests.bricks.block.summary", {
				defaultMessage: "This is an example block",
			}),
		},
		thumbnail: "https://placehold.co/600x400",
		fields: [field.text("text_test"), field.textarea("textarea_test")],
	});

	const res = await BrickConfigSchema.safeParseAsync(brick.config);
	expect(res.success).toBe(true);
});
