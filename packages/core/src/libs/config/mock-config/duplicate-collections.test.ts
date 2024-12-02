import { expect, test, vi } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import getConfig from "../get-config.js";
import winstonLogger from "../../../utils/logging/logger.js";
import { messageFormat, LoggerScopes } from "../../../utils/logging/index.js";

test("should throw duplicate collection key error", async () => {
	const consoleLogSpy = vi
		.spyOn(winstonLogger, "error")
		// @ts-expect-error
		.mockImplementation(() => {});

	const processExitSpy = vi
		.spyOn(process, "exit")
		// @ts-expect-error
		.mockImplementation(() => {});

	await getConfig({
		path: path.resolve(__dirname, "./duplicate-collections.ts"),
		dynamicImport: true,
	});

	expect(consoleLogSpy).toHaveBeenCalledWith(
		messageFormat({
			scope: LoggerScopes.CONFIG,
			message: T("config_duplicate_keys", { builder: "collections" }),
		}),
		undefined,
	);
	expect(processExitSpy).toHaveBeenCalledWith(1);
	processExitSpy.mockRestore();
	consoleLogSpy.mockRestore();
});
