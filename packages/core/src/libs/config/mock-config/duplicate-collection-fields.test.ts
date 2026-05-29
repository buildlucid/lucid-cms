import path from "node:path";
import { expect, test } from "vitest";
import { translate } from "../../i18n/index.js";
import loadConfigFile from "../load-config-file.js";

test("should throw duplicate collection field key error", async () => {
	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./duplicate-collection-fields.ts"),
		}),
	).rejects.toThrow(
		translate.server("core.collections.fields.duplicates", {
			type: "collection",
			keys: ["title"].join(", "),
			typeKey: "page",
		}),
	);
});
