import path from "node:path";
import { expect, test } from "vitest";
import T from "../../translations/index.js";
import getConfigPath from "./get-config-path.js";

test("finds lucid.config.ts file", async () => {
	const configPath = getConfigPath(path.resolve(__dirname, "./mock-config"));
	expect(configPath).toContain("lucid.config.ts");
});

test("throws on missing file", async () => {
	expect(() => getConfigPath(process.cwd(), "test.cfdonfig")).toThrowError(
		T("cannot_find_config_path"),
	);
});
