import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import writePluginModules from "./write-plugin-modules.js";

describe("writePluginModules", () => {
	test("imports each module relative to the file, keyed by plugin", async () => {
		const outDir = await mkdtemp(path.join(tmpdir(), "lucid-modules-"));
		const file = path.join(outDir, "lucid", "plugin-modules.js");
		await import("node:fs/promises").then((fs) =>
			fs.mkdir(path.dirname(file), { recursive: true }),
		);
		await writePluginModules(file, {
			"@acme/plugin": path.join(
				outDir,
				"plugins",
				"@acme",
				"plugin",
				"server.js",
			),
		});
		expect(await readFile(file, "utf8")).toBe(
			'import * as m0 from "../plugins/@acme/plugin/server.js";\n\nexport default {\n\t"@acme/plugin": m0,\n};\n',
		);
	});

	test("writes an empty map without modules", async () => {
		const file = path.join(
			await mkdtemp(path.join(tmpdir(), "lucid-modules-")),
			"plugin-modules.js",
		);
		await writePluginModules(file, {});
		expect(await readFile(file, "utf8")).toBe("\n\nexport default {\n\n};\n");
	});
});
