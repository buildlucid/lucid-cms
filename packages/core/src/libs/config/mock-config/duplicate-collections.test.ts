import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import loadConfigFile from "../load-config-file.js";

test("should throw duplicate collection key error", async () => {
	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./duplicate-collections.ts"),
		}),
	).rejects.toThrow(
		T("config_duplicate_keys", {
			builder: "collections",
		}),
	);
});
