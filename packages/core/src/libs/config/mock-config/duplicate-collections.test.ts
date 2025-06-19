import { expect, test, vi } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import getConfig from "../get-config.js";
import { messageFormat } from "../../../utils/logging/index.js";
import constants from "../../../constants/constants.js";
import getLogger from "../../../utils/logging/logger.js";

test("should throw duplicate collection key error", async () => {
	const logger = getLogger();
	const consoleLogSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

	const processExitSpy = vi
		.spyOn(process, "exit")
		// @ts-expect-error
		.mockImplementation(() => {});

	await getConfig({
		path: path.resolve(__dirname, "./duplicate-collections.ts"),
		dynamicImport: true,
	});

	expect(consoleLogSpy).toHaveBeenCalledWith(
		{},
		messageFormat("error", {
			scope: constants.logScopes.config,
			message: T("config_duplicate_keys", {
				builder: "collections",
			}),
		}),
	);
	expect(processExitSpy).toHaveBeenCalledWith(1);
	processExitSpy.mockRestore();
	consoleLogSpy.mockRestore();
});
