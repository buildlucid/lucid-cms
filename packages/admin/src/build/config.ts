import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { type InlineConfig, searchForWorkspaceRoot } from "vite";
import solid from "vite-plugin-solid";
import packageJson from "../../package.json" with { type: "json" };
import type { AdminConfig } from "../extensions/types/config.js";
import {
	adminExtensionsPlugin,
	hasAdminExtensions,
} from "./extensions/plugin.js";

// Resolve the owning package independently of the compiler output's directory depth.
export const adminRoot = path.dirname(
	fileURLToPath(import.meta.resolve("@lucidcms/admin/package.json")),
);

const compilerDependencies = new Set([
	"vite",
	"vite-plugin-solid",
	"tailwindcss",
	"@tailwindcss/vite",
]);

const browserEntrypoints: Record<string, string[]> = {
	// These packages export Solid source that the Solid plugin transforms directly.
	"@kobalte/core": [],
	"@lucidcms/admin": [],
	"@solidjs/router": [],
	"@thisbeyond/solid-dnd": [],
	"solid-toast": [],
	"solid-icons": [],
	"@lucidcms/rich-text": ["@lucidcms/rich-text/browser"],
	"@tiptap/pm": ["@tiptap/pm/gapcursor", "@tiptap/pm/state"],
	"@codemirror/legacy-modes": ["@codemirror/legacy-modes/mode/shell"],
};

export type AdminConfigOptions = {
	projectRoot: string;
	/** Absolute path returned by the host's config loader. */
	configPath: string;
	admin?: AdminConfig;
};

/** The installed admin package owns its compiler configuration and input paths. */
export const createAdminConfig = ({
	projectRoot,
	configPath,
	admin,
}: AdminConfigOptions): InlineConfig => ({
	configFile: false,
	// The CLI or Astro host owns terminal clearing; admin HMR only appends updates.
	clearScreen: false,
	envDir: false,
	root: adminRoot,
	base: "/lucid/",
	publicDir: false,
	cacheDir: path.join(projectRoot, ".lucid/vite/admin"),
	plugins: [
		adminExtensionsPlugin({
			configPath,
			admin,
			stylesheetPath: path.join(adminRoot, "src/index.css"),
		}),
		tailwindcss(),
		solid(),
	],
	server: { fs: { allow: [searchForWorkspaceRoot(projectRoot), adminRoot] } },
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
		noDiscovery: !hasAdminExtensions(admin),
		exclude: Object.entries(browserEntrypoints)
			.filter(([, entries]) => entries.length === 0)
			.map(([name]) => name),
		include: [
			...Object.keys(packageJson.dependencies)
				.filter((name) => !compilerDependencies.has(name))
				.flatMap((name) => browserEntrypoints[name] ?? [name]),
			"solid-js/web",
			"solid-js/store",
		],
	},
});
