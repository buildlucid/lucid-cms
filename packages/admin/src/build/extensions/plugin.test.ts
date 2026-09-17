// @vitest-environment node

import {
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, createServer } from "vite";
import solid from "vite-plugin-solid";
import { expect, test } from "vitest";
import { adminExtensionsPlugin } from "./plugin.js";

test("bundles project and browser package entries without executing them, including scripts and styles", async () => {
	const root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid-admin-")),
	);
	try {
		const require = createRequire(import.meta.url);
		await mkdir(path.join(root, "node_modules/test-plugin"), {
			recursive: true,
		});
		await symlink(
			path.dirname(require.resolve("solid-js/package.json")),
			path.join(root, "node_modules/solid-js"),
			"dir",
		);
		await writeFile(
			path.join(root, "node_modules/test-plugin/package.json"),
			JSON.stringify({
				name: "test-plugin",
				type: "module",
				exports: { "./panel": { browser: "./Panel.jsx", node: "./wrong.js" } },
			}),
		);
		await writeFile(
			path.join(root, "node_modules/test-plugin/Panel.jsx"),
			"export default () => <div>browser-export-panel</div>",
		);
		await writeFile(
			path.join(root, "node_modules/test-plugin/wrong.js"),
			'throw new Error("wrong-node-export")',
		);
		await writeFile(
			path.join(root, "Page.jsx"),
			'if (!document) throw new Error("browser only"); export default () => <h1>custom-route-page</h1>',
		);
		await writeFile(
			path.join(root, "startup.js"),
			'document.documentElement.dataset.extension = "startup-script";',
		);
		await writeFile(
			path.join(root, "style.css"),
			".test-extension { color: rebeccapurple; }",
		);
		await writeFile(
			path.join(root, "index.html"),
			'<div id="root"></div><script type="module" src="/main.js"></script>',
		);
		await writeFile(
			path.join(root, "main.js"),
			'import "./main.css"; import { routes, brickSlots, fieldSlots } from "virtual:lucid-admin"; import "virtual:lucid-admin-assets"; window.testRegistry = { routes, brickSlots, fieldSlots };',
		);
		await writeFile(path.join(root, "main.css"), "");
		await build({
			configFile: false,
			root,
			logLevel: "silent",
			plugins: [
				adminExtensionsPlugin({
					configPath: path.join(root, "lucid.config.js"),
					stylesheetPath: path.join(root, "main.css"),
					admin: {
						routes: [{ key: "test", path: "reports", component: "./Page.jsx" }],
						slots: [
							{
								key: "field-panel",
								slot: "field.after",
								match: { brick: "seo", field: "title" },
								component: "test-plugin/panel",
							},
							{
								key: "panel",
								slot: "brick.afterFields",
								match: { brick: "seo" },
								component: "test-plugin/panel",
							},
						],
						scripts: ["./startup.js", "https://example.com/challenge.js"],
						stylesheets: ["./style.css", "https://example.com/theme.css"],
					},
				}),
				solid(),
			],
			build: { minify: false, manifest: true },
		});
		const html = await readFile(path.join(root, "dist/index.html"), "utf8");
		expect(html).toContain('src="https://example.com/challenge.js"');
		expect(html).toContain('href="https://example.com/theme.css"');
		const manifestText = await readFile(
			path.join(root, "dist/.vite/manifest.json"),
			"utf8",
		);
		expect(manifestText).toContain("Page.jsx");
		expect(manifestText).toContain("Panel.jsx");
		expect(manifestText).not.toContain("wrong.js");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("includes remote assets on the first development HTML response", async () => {
	const server = await createServer({
		configFile: false,
		plugins: [
			adminExtensionsPlugin({
				configPath: fileURLToPath(import.meta.url),
				stylesheetPath: fileURLToPath(
					new URL("../../index.css", import.meta.url),
				),
				admin: {
					scripts: ["https://example.com/challenge.js"],
					stylesheets: ["https://example.com/theme.css"],
				},
			}),
		],
		server: { middlewareMode: true },
	});
	try {
		const html = await server.transformIndexHtml(
			"/index.html",
			"<html><head></head><body></body></html>",
		);
		expect(html).toContain("https://example.com/challenge.js");
		expect(html).toContain("https://example.com/theme.css");
	} finally {
		await server.close();
	}
});

test.each([
	"lucid.config.js",
	"lucid.config.ts",
])("resolves %s extensions from a nested workspace in dev and build", async (configName) => {
	const workspace = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid-workspace-")),
	);
	const projectRoot = path.join(workspace, "apps/cms");
	const adminRoot = path.join(workspace, "packages/admin");
	const configPath = path.join(projectRoot, configName);
	const require = createRequire(import.meta.url);
	try {
		await mkdir(projectRoot, { recursive: true });
		await mkdir(adminRoot, { recursive: true });
		await mkdir(path.join(workspace, "node_modules"), { recursive: true });
		await symlink(
			path.dirname(require.resolve("solid-js/package.json")),
			path.join(workspace, "node_modules/solid-js"),
			"dir",
		);
		await writeFile(
			configPath,
			'throw new Error("the plugin must not execute the config");',
		);
		await writeFile(
			path.join(projectRoot, "Panel.jsx"),
			"export default () => <p>config-relative-panel</p>;",
		);
		await writeFile(
			path.join(projectRoot, "startup.js"),
			'document.documentElement.dataset.nested = "nested-startup";',
		);
		await writeFile(
			path.join(projectRoot, "style.css"),
			".nested-theme { color: blue; }",
		);

		// The nearest package wins; a separate package is available only at workspace level.
		for (const [directory, marker] of [
			[
				path.join(projectRoot, "node_modules/local-plugin"),
				"nearest-package-panel",
			],
			[
				path.join(workspace, "node_modules/local-plugin"),
				"wrong-workspace-package",
			],
			[
				path.join(workspace, "packages/shared-plugin"),
				"linked-workspace-panel",
			],
		]) {
			await mkdir(directory, { recursive: true });
			await writeFile(
				path.join(directory, "package.json"),
				JSON.stringify({
					type: "module",
					exports: {
						"./panel": { browser: "./Panel.jsx", node: "./wrong.js" },
					},
				}),
			);
			await writeFile(
				path.join(directory, "Panel.jsx"),
				`export default () => <p>${marker}</p>;`,
			);
			await writeFile(
				path.join(directory, "wrong.js"),
				'throw new Error("wrong-node-condition");',
			);
		}
		await symlink(
			path.join(workspace, "packages/shared-plugin"),
			path.join(workspace, "node_modules/shared-plugin"),
			"dir",
		);
		await writeFile(
			path.join(adminRoot, "index.html"),
			'<div id="root"></div><script type="module" src="/main.js"></script>',
		);
		await writeFile(
			path.join(adminRoot, "main.js"),
			'import "./main.css"; import { routes, brickSlots, fieldSlots } from "virtual:lucid-admin"; import "virtual:lucid-admin-assets"; window.registry = { routes, brickSlots, fieldSlots };',
		);
		await writeFile(path.join(adminRoot, "main.css"), "");
		const plugin = () =>
			adminExtensionsPlugin({
				configPath,
				stylesheetPath: path.join(adminRoot, "main.css"),
				admin: {
					routes: [
						{
							key: "relative",
							path: "relative",
							component: "./Panel.jsx",
							navigation: {
								label: "Workspace reports",
								group: "content",
								order: 2,
								icon: "overview",
							},
						},
						{
							key: "url",
							path: "url",
							component: pathToFileURL(path.join(projectRoot, "Panel.jsx")),
						},
						{ key: "local", path: "local", component: "local-plugin/panel" },
						{ key: "shared", path: "shared", component: "shared-plugin/panel" },
					],
					scripts: ["./startup.js"],
					stylesheets: ["./style.css"],
				},
			});
		const server = await createServer({
			configFile: false,
			root: adminRoot,
			logLevel: "silent",
			plugins: [plugin(), solid()],
			optimizeDeps: { noDiscovery: true, include: [] },
			server: { middlewareMode: true, fs: { allow: [workspace] } },
		});
		try {
			const registry = await server.transformRequest("\0virtual:lucid-admin");
			expect(registry?.code).toContain("apps/cms/Panel.jsx");
			expect(registry?.code).toContain("Workspace reports");
			expect(registry?.code).toContain(
				"apps/cms/node_modules/local-plugin/Panel.jsx",
			);
			expect(registry?.code).toContain("packages/shared-plugin/Panel.jsx");
			const assets = await server.transformRequest(
				"\0virtual:lucid-admin-assets",
			);
			expect(assets?.code).toContain("apps/cms/startup.js");
			const stylesheet = await server.transformRequest("/main.css");
			expect(stylesheet?.code).toContain(".nested-theme");
		} finally {
			await server.close();
		}
		const result = await build({
			configFile: false,
			root: adminRoot,
			logLevel: "silent",
			plugins: [plugin(), solid()],
			build: { write: false, minify: false },
		});
		if (Array.isArray(result) || !("output" in result))
			throw new Error("Expected one application build");
		const code = result.output
			.map((entry) =>
				entry.type === "chunk" ? entry.code : String(entry.source),
			)
			.join("\n");
		expect(code).toContain("config-relative-panel");
		expect(code).toContain("Workspace reports");
		expect(code).toContain("nearest-package-panel");
		expect(code).toContain("linked-workspace-panel");
		expect(code).toContain("nested-startup");
		expect(code).toContain(".nested-theme");
		expect(code).not.toContain("wrong-workspace-package");
		expect(code).not.toContain("wrong-node-condition");
	} finally {
		await rm(workspace, { recursive: true, force: true });
	}
});
