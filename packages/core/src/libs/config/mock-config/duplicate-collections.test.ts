import path from "node:path";
import { expect, test } from "vitest";
import { translate } from "../../i18n/index.js";
import loadConfigFile from "../load-config-file.js";

test("should throw duplicate collection key error", async () => {
	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./duplicate-collections.ts"),
		}),
	).rejects.toThrow(
		translate("server:core.config.duplicate.keys", {
			data: {
				builder: "collections",
			},
		}),
	);
});
