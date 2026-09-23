import type { ResourceDirectories, ResourceFiles } from "./types.js";

export const defaultDirectories = {
	migrations: "./lucid/migrations",
	seeds: "./lucid/seeds",
	translations: "./lucid/translations",
	templates: "./lucid/templates",
	public: "./public",
} satisfies Required<ResourceDirectories>;

export const emptyResourceFiles = (): ResourceFiles => ({
	migrations: [],
	seeds: [],
	translations: [],
	templates: [],
	public: [],
});
