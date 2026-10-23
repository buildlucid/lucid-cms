// @vitest-environment node

import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer, isRunnableDevEnvironment } from "vite";
import { expect, test, vi } from "vitest";
import siteDevPlugin from "./site-dev-plugin.js";

test("reloads pages when code outside the site directory that a site file imports changes", async () => {
	const root = await realpath(
		await mkdtemp(path.join(tmpdir(), "lucid-site-")),
	);
	await mkdir(path.join(root, "site"));
	await mkdir(path.join(root, "shared"));
	await writeFile(
		path.join(root, "site/card.js"),
		'export { label } from "../shared/label.js";\n',
	);
	await writeFile(
		path.join(root, "shared/label.js"),
		'export const label = "Card";\n',
	);
	await writeFile(
		path.join(root, "shared/unused.js"),
		"export const unused = 1;\n",
	);
	const server = await createServer({
		root,
		configFile: false,
		logLevel: "silent",
		server: { middlewareMode: true, ws: false },
		plugins: [
			siteDevPlugin({
				root: path.join(root, "site"),
				ui: null,
				extensions: [],
				runtime: "node",
				prefix: "site/",
				viteRoot: root,
				clientBuild: null,
			}),
		],
	});
	try {
		const { ssr, client } = server.environments;
		if (!ssr || !client || !isRunnableDevEnvironment(ssr)) {
			throw new Error("Expected Vite's default environments.");
		}
		await ssr.runner.import("/site/card.js");
		const send = vi.spyOn(client.hot, "send");

		server.watcher.emit("change", path.join(root, "shared/unused.js"));
		await vi.waitFor(() => expect(send).not.toHaveBeenCalled());
		server.watcher.emit("change", path.join(root, "shared/label.js"));
		await vi.waitFor(() =>
			expect(send).toHaveBeenCalledWith({ type: "full-reload" }),
		);
	} finally {
		await server.close();
		await rm(root, { recursive: true, force: true });
	}
});
