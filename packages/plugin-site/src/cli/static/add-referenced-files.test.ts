import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import addReferencedFiles from "./add-referenced-files.js";

test("adds a worker's bundle and the files it loads, leaving out unnamed files", async () => {
	const outDir = await mkdtemp(path.join(tmpdir(), "lucid-site-"));
	try {
		await mkdir(path.join(outDir, "_assets"));
		const write = (file: string, content: string) =>
			writeFile(path.join(outDir, file), content);
		await write(
			"_assets/site-a1.js",
			'new Worker(new URL("/_assets/worker-b2.js", import.meta.url));',
		);
		await write(
			"_assets/worker-b2.js",
			'import("./chunk-c3.js"); fetch(new URL("./module-d4.wasm", import.meta.url));',
		);
		await write("_assets/chunk-c3.js", "export {};");
		await write("_assets/module-d4.wasm", "");
		await write("_assets/admin-e5.js", "export {};");
		const files = new Set(["_assets/site-a1.js"]);

		await addReferencedFiles({ outDir, assetsDir: "_assets", files });

		expect([...files].sort()).toEqual([
			"_assets/chunk-c3.js",
			"_assets/module-d4.wasm",
			"_assets/site-a1.js",
			"_assets/worker-b2.js",
		]);
	} finally {
		await rm(outDir, { recursive: true, force: true });
	}
});
