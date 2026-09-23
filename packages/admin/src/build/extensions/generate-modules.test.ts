// @vitest-environment node

import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { generateRegistry } from "./generate-modules.js";

test("loads named exports and names the module when an export is missing", async () => {
	const root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid-registry-")),
	);
	try {
		const panel = path.join(root, "panel.js");
		await writeFile(panel, 'export const Panel = "panel";');
		const code = await generateRegistry(
			{
				slots: [
					{
						key: "found",
						slot: "field.after",
						component: { module: "./panel.js", export: "Panel" },
					},
					{
						key: "missing",
						slot: "field.after",
						component: { module: "./panel.js", export: "Missing" },
					},
				],
			},
			async () => panel,
		);
		const registry = path.join(root, "registry.js");
		// Swap Solid's lazy for the raw loader so the test can await it.
		await writeFile(
			registry,
			code.replace(
				'import { lazy } from "solid-js";',
				"const lazy = (load) => load;",
			),
		);
		const { fieldSlots } = await import(pathToFileURL(registry).href);

		await expect(fieldSlots[0].component()).resolves.toEqual({
			default: "panel",
		});
		await expect(fieldSlots[1].component()).rejects.toThrow(
			'Admin slot "missing": "./panel.js" has no export "Missing".',
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
