import { expect, test, vi } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import getConfig from "../get-config.js";

test("should throw duplicate collection key error", async () => {
	await expect(
		getConfig({
			path: path.resolve(__dirname, "./duplicate-collections.ts"),
		}),
	).rejects.toThrow(
		T("config_duplicate_keys", {
			builder: "collections",
		}),
	);
});
