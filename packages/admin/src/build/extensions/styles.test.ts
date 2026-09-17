// @vitest-environment node

import {
	mkdir,
	mkdtemp,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { build, createServer } from "vite";
import { expect, test } from "vitest";
import { adminExtensionsPlugin } from "./plugin.js";

test("compiles project and installed plugin themes together and watches their sources", async () => {
	const root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid css-")),
	);
	const adminRoot = path.dirname(
		fileURLToPath(import.meta.resolve("@lucidcms/admin/package.json")),
	);
	const stylesheetPath = path.join(root, "main.css");
	const pluginRoot = path.join(root, "node_modules/test-plugin");
	const sourceRoot = path.join(root, "src/admin");
	try {
		await mkdir(path.join(root, "node_modules/@lucidcms"), { recursive: true });
		await symlink(
			adminRoot,
			path.join(root, "node_modules/@lucidcms/admin"),
			"dir",
		);
		await writeFile(
			stylesheetPath,
			`
@import ${JSON.stringify(fileURLToPath(import.meta.resolve("tailwindcss/index.css")))} source(none);
@import "@lucidcms/admin/theme.css";
@import ${JSON.stringify(path.join(adminRoot, "src/styles/fonts.css"))};
`,
		);
		await mkdir(pluginRoot, { recursive: true });
		await mkdir(path.join(sourceRoot, "parts"), { recursive: true });
		await writeFile(
			path.join(pluginRoot, "package.json"),
			JSON.stringify({
				name: "test-plugin",
				exports: { "./styles.css": "./styles.css" },
			}),
		);
		await writeFile(
			path.join(pluginRoot, "styles.css"),
			`
@import "@lucidcms/admin/theme.css";
@source "./";
@theme { --color-plugin-accent: #123456; }
`,
		);
		await writeFile(
			path.join(pluginRoot, "Panel.js"),
			'export const classes = "text-plugin-accent p-[43px]";',
		);
		await writeFile(
			path.join(sourceRoot, "styles.css"),
			`
@import "@lucidcms/admin/theme.css";
@source "./";
@theme { --color-project-accent: #654321; --breakpoint-md: 55rem; }
@utility project-panel { outline-width: 7px; }
`,
		);
		const helperPath = path.join(sourceRoot, "parts/Helper.js");
		await writeFile(
			helperPath,
			'export const classes = "p-[37px] md:p-[39px] text-project-accent project-panel bg-card-base dark:text-primary-base";',
		);
		await writeFile(
			path.join(root, "unrelated.js"),
			'export const classes = "p-[137px]";',
		);
		await writeFile(
			path.join(sourceRoot, "panel.module.css"),
			'@reference "./styles.css"; .panel { @apply bg-card-base text-project-accent; }',
		);
		await writeFile(
			path.join(root, "main.js"),
			`import ${JSON.stringify(stylesheetPath)}; import styles from "./src/admin/panel.module.css"; window.panelClass = styles.panel;`,
		);
		const plugins = () => [
			adminExtensionsPlugin({
				configPath: path.join(root, "lucid.config.js"),
				stylesheetPath,
				admin: {
					stylesheets: ["test-plugin/styles.css", "./src/admin/styles.css"],
				},
			}),
			tailwindcss(),
		];
		const result = await build({
			configFile: false,
			root,
			plugins: plugins(),
			logLevel: "silent",
			build: {
				write: false,
				cssMinify: false,
				rollupOptions: { input: path.join(root, "main.js") },
			},
		});
		if (Array.isArray(result) || !("output" in result))
			throw new Error("Expected one CSS build");
		const css = result.output
			.flatMap((entry) =>
				entry.type === "asset" && entry.fileName.endsWith(".css")
					? [String(entry.source)]
					: [],
			)
			.join("\n");
		for (const expected of [
			"padding: 37px",
			"padding: 43px",
			"min-width: 55rem",
			".text-project-accent",
			".text-plugin-accent",
			"outline-width: 7px",
			"var(--lucid-card-base)",
			'[data-theme="dark"]',
		])
			expect(css).toContain(expected);
		expect(css).not.toContain("padding: 137px");
		expect(css.match(/@font-face/g)).toHaveLength(5);
		expect(css).toMatch(
			/\.\w*panel\w*\s*\{[^}]*color: var\(--color-project-accent[,)]/,
		);

		const server = await createServer({
			configFile: false,
			root,
			plugins: plugins(),
			logLevel: "silent",
			optimizeDeps: { noDiscovery: true, include: [] },
			server: { middlewareMode: true, fs: { allow: [root, adminRoot] } },
		});
		try {
			const cssUrl = `/@fs/${stylesheetPath}`;
			expect((await server.transformRequest(cssUrl))?.code).toContain("37px");
			await writeFile(
				helperPath,
				'export const classes = "p-[41px] text-project-accent";',
			);
			await expect
				.poll(async () => (await server.transformRequest(cssUrl))?.code)
				.toContain("41px");
			await writeFile(
				path.join(sourceRoot, "styles.css"),
				'@import "@lucidcms/admin/theme.css"; @source "./"; @theme { --color-project-accent: #abcdef; }',
			);
			await expect
				.poll(async () => (await server.transformRequest(cssUrl))?.code)
				.toContain("#abcdef");
		} finally {
			await server.close();
		}
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
