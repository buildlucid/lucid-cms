import path from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../../package.json" with { type: "json" };

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

/** Import aliases the admin's source uses, which only apply to the admin's own modules. */
export const adminAliases: Record<string, string> = {
	"@": path.join(adminRoot, "src"),
	"@assets": path.join(adminRoot, "src/assets"),
	"@field-conditions": path.join(adminRoot, "dist/shared/conditions.js"),
	"@field-capabilities": path.join(adminRoot, "dist/shared/capabilities.js"),
	"@match-permissions": path.join(
		adminRoot,
		"dist/shared/match-permissions.js",
	),
	"@ai-feature-access": path.join(
		adminRoot,
		"dist/shared/ai-feature-access.js",
	),
	"@lucidcms/preview-protocol": path.join(adminRoot, "dist/shared/preview.js"),
};

/** Packages Vite should pre-bundle for the admin, and Solid source packages it must leave for the Solid plugin. */
export const adminOptimizeDeps = {
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
};

/** Packages that must load once, so admin and extension code share their state. */
export const adminDedupe = [
	"solid-js",
	"@solidjs/router",
	"@tanstack/solid-query",
];
