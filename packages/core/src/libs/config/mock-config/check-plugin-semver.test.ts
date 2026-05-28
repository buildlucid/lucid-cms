import path from "node:path";
import semver from "semver";
import { expect, test } from "vitest";
import packageJson from "../../../../package.json" with { type: "json" };
import { translateServer } from "../../i18n/index.js";
import loadConfigFile from "../load-config-file.js";

test("should throw lucid version support error", async () => {
	const version = semver.coerce(packageJson.version) ?? packageJson.version;

	await expect(
		loadConfigFile({
			path: path.resolve(__dirname, "./check-plugin-semver.ts"),
		}),
	).rejects.toThrow(
		translateServer("core.plugins.version.not.supported", {
			version: version as string,
			supportedVersions: "100.0.0",
		}),
	);
});
