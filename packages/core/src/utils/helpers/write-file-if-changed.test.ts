import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import writeFileIfChanged from "./write-file-if-changed.js";

test("preserves unchanged artifacts and writes changed content", async () => {
	const root = await mkdtemp(path.join(tmpdir(), "lucid-write-"));
	const file = path.join(root, "types.d.ts");
	try {
		await writeFileIfChanged(file, "first");
		await utimes(file, new Date(0), new Date(0));
		await writeFileIfChanged(file, "first");
		expect((await stat(file)).mtimeMs).toBe(0);
		await writeFileIfChanged(file, "second");
		expect(await readFile(file, "utf8")).toBe("second");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
