// @vitest-environment node

import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, resolveConfig } from "vite";
import { expect, test } from "vitest";
import lucidConfigPlugin from "./lucid-config-plugin.js";

test("keeps the database adapter's files, those named after them and Vite's defaults away from the dev server", async () => {
	const root = await realpath(
		await mkdtemp(path.join(tmpdir(), "lucid-config-")),
	);
	for (const file of ["cms.sqlite3", "cms.sqlite3-wal", ".env", "page.txt"]) {
		await writeFile(path.join(root, file), file);
	}
	const project = {
		env: {},
		config: {
			build: { outDir: path.join(root, "dist") },
			db: { localFiles: async () => [path.join(root, "cms.sqlite3")] },
		},
	};
	const server = await createServer({
		root,
		configFile: false,
		logLevel: "silent",
		plugins: [
			lucidConfigPlugin({
				project: project as never,
				token: "token",
				ready: Promise.resolve(true),
				startMessage: "Starting",
				listen: { port: 0 },
			}),
		],
	});
	try {
		await server.listen();
		const address = server.httpServer?.address();
		if (!address || typeof address === "string") {
			throw new Error("Expected the server to listen on a port.");
		}
		const status = async (file: string) =>
			(await fetch(`http://localhost:${address.port}/${file}`)).status;

		expect(await status("cms.sqlite3")).toBe(403);
		expect(await status("cms.sqlite3-wal")).toBe(403);
		expect(await status(".env")).toBe(403);
		expect(await status("page.txt")).toBe(200);

		// Setting `deny` replaces Vite's defaults, so the plugin's copy of them must keep up with Vite.
		const defaults = await resolveConfig(
			{ root, configFile: false, logLevel: "silent" },
			"serve",
		);
		expect(server.config.server.fs.deny).toEqual(
			expect.arrayContaining(defaults.server.fs.deny),
		);
	} finally {
		await server.close();
		await rm(root, { recursive: true, force: true });
	}
});
