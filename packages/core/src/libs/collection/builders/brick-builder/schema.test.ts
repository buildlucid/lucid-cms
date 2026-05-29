import { expect, test } from "vitest";
import { copy } from "../../../i18n/index.js";
import BrickBuilder from "./index.js";
import BrickConfigSchema from "./schema.js";

test("brick builder config passes schema validation", async () => {
	const brick = new BrickBuilder("block", {
		details: {
			name: copy("admin:tests.bricks.block.name", {
				defaultMessage: "Block",
			}),
			summary: copy("admin:tests.bricks.block.summary", {
				defaultMessage: "This is an example block",
			}),
		},
		preview: {
			image: "https://placehold.co/600x400",
		},
	})
		.addText("text_test")
		.addTextarea("textarea_test");

	const res = await BrickConfigSchema.safeParseAsync(brick.config);
	expect(res.success).toBe(true);
});
