import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import loadDevEnv from "./load-dev-env.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

test("reads the mode's .dev.vars on its own, otherwise the mode's .env files under the process's variables", async () => {
	const root = await mkdtemp(path.join(tmpdir(), "lucid-env-"));
	try {
		const write = (file: string, content: string) =>
			writeFile(path.join(root, file), content);
		await write(".env", "SITE=env\nTOKEN=env\n");
		await write(".env.production", "SITE=production\n");
		vi.stubEnv("TOKEN", "process");

		const fromEnv = await loadDevEnv(root, "production");
		expect(fromEnv).toMatchObject({ SITE: "production", TOKEN: "process" });

		await write(".dev.vars", "SITE=dev-vars\n");
		await write(".dev.vars.production", "SITE=dev-vars-production\n");
		await expect(loadDevEnv(root, "production")).resolves.toEqual({
			SITE: "dev-vars-production",
		});
		await expect(loadDevEnv(root, "development")).resolves.toEqual({
			SITE: "dev-vars",
		});
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
