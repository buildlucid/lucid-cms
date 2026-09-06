import path from "node:path";
import { expect, test } from "vitest";
import loadConfigFile from "../load-config-file.js";

test("should throw duplicate collection field key error", async () => {
	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./duplicate-collection-fields.ts"),
		}),
	).rejects.toThrow('Field "title" is already registered.');
});
