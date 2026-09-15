import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import type { InlineConfig } from "vite";
import solid from "vite-plugin-solid";
import packageJson from "../../package.json" with { type: "json" };

// This module is emitted at dist/build/config.mjs in the published package.
export const adminRoot = fileURLToPath(new URL("../../", import.meta.url));

const compilerDependencies = new Set([
	"vite",
	"vite-plugin-solid",
	"tailwindcss",
	"@tailwindcss/vite",
]);

const browserEntrypoints: Record<string, string[]> = {
	// These packages export Solid source that the Solid plugin transforms directly.
	"@kobalte/core": [],
	"@solidjs/router": [],
	"@thisbeyond/solid-dnd": [],
	"solid-toast": [],
	"@lucidcms/rich-text": ["@lucidcms/rich-text/browser"],
	"@tiptap/pm": ["@tiptap/pm/gapcursor", "@tiptap/pm/state"],
	"@codemirror/legacy-modes": ["@codemirror/legacy-modes/mode/shell"],
};

/** The installed admin package owns its compiler configuration and input paths. */
export const createAdminConfig = (projectRoot: string): InlineConfig => ({
	configFile: false,
	// The CLI or Astro host owns terminal clearing; admin HMR only appends updates.
	clearScreen: false,
	envDir: false,
	root: adminRoot,
	base: "/lucid/",
	publicDir: false,
	cacheDir: path.join(projectRoot, ".lucid/vite/admin"),
	plugins: [tailwindcss(), solid()],
	resolve: {
		dedupe: ["solid-js", "@solidjs/router", "@tanstack/solid-query"],
		alias: {
			"@": path.join(adminRoot, "src"),
			"@assets": path.join(adminRoot, "src/assets"),
			"@field-conditions": path.join(adminRoot, "dist/shared/conditions.js"),
			"@field-capabilities": path.join(
				adminRoot,
				"dist/shared/capabilities.js",
			),
			"@lucidcms/preview-protocol": path.join(
				adminRoot,
				"dist/shared/preview.js",
			),
		},
	},
	optimizeDeps: {
		// The installed source lives in node_modules. Explicit entries prevent Vite
		// from treating our source aliases as dependencies or missing CommonJS imports.
		noDiscovery: true,
		include: [
			...Object.keys(packageJson.dependencies)
				.filter((name) => !compilerDependencies.has(name))
				.flatMap((name) => browserEntrypoints[name] ?? [name]),
			"solid-js/web",
			"solid-js/store",
		],
	},
});
