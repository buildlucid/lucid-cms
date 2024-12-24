import { expect, test, vi } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import getConfig from "../get-config.js";
import winstonLogger from "../../../utils/logging/logger.js";
import { messageFormat } from "../../../utils/logging/index.js";
import packageJson from "../../../../package.json" with { type: "json" };
import semver from "semver";

test("should throw lucid version support error", async () => {
	const consoleLogSpy = vi
		.spyOn(winstonLogger, "error")
		// @ts-expect-error
		.mockImplementation(() => {});

	const processExitSpy = vi
		.spyOn(process, "exit")
		// @ts-expect-error
		.mockImplementation(() => {});

	await getConfig({
		path: path.resolve(__dirname, "./check-plugin-semver.ts"),
		dynamicImport: true,
	});

	const version = semver.coerce(packageJson.version) ?? packageJson.version;
	expect(consoleLogSpy).toHaveBeenCalledWith(
		messageFormat("error", {
			scope: "plugin-testing",
			message: T("plugin_version_not_supported", {
				version: version as string,
				supportedVersions: "100.0.0",
			}),
		}),
		undefined,
	);
	expect(processExitSpy).toHaveBeenCalledWith(1);
	processExitSpy.mockRestore();
	consoleLogSpy.mockRestore();
});
