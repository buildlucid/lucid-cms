import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import getConfig from "../get-config.js";

test("should throw duplicate collection field key error", async () => {
	await expect(
		getConfig({
			path: path.resolve(__dirname, "./duplicate-collection-fields.ts"),
		}),
	).rejects.toThrow(
		T("duplicate_field_keys_message", {
			type: "collection",
			keys: ["title"].join(", "),
			typeKey: "page",
		}),
	);
});
