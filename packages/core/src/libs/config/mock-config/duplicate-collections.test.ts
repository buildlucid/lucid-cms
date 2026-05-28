import path from "node:path";
import { expect, test } from "vitest";
import { translateServer } from "../../i18n/index.js";
import loadConfigFile from "../load-config-file.js";

test("should throw duplicate collection key error", async () => {
	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./duplicate-collections.ts"),
		}),
	).rejects.toThrow(
		translateServer("core.config.duplicate.keys", {
			builder: "collections",
		}),
	);
});
