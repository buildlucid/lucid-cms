import type { ResourceDiscovery, ResourceFiles } from "./types.js";

export const defaultDiscovery = {
	collections: "./src/lucid/collections",
	tables: "./src/lucid/tables",
	routes: "./src/lucid/routes",
	hooks: "./src/lucid/hooks",
	jobs: "./src/lucid/jobs",
	migrations: "./src/lucid/migrations",
	seeds: "./src/lucid/seeds",
	translations: "./src/lucid/translations",
	templates: "./src/lucid/templates",
	public: "./public",
} satisfies Required<ResourceDiscovery>;

export const emptyResourceFiles = (): ResourceFiles => ({
	collections: [],
	tables: [],
	routes: [],
	hooks: [],
	jobs: [],
	migrations: [],
	seeds: [],
	translations: [],
	templates: [],
	public: [],
});
