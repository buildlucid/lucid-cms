import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import path from "node:path";
import loadConfigFile from "../load-config-file.js";
import packageJson from "../../../../package.json" with { type: "json" };
import semver from "semver";

test("should throw lucid version support error", async () => {
	const version = semver.coerce(packageJson.version) ?? packageJson.version;

	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./check-plugin-semver.ts"),
		}),
	).rejects.toThrow(
		T("plugin_version_not_supported", {
			version: version as string,
			supportedVersions: "100.0.0",
		}),
	);
});
