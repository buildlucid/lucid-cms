import type { ResourceDirectories, ResourceFiles } from "./types.js";

export const defaultDirectories = {
	migrations: "./database/migrations",
	seeds: "./database/seeds",
	translations: "./translations",
	emails: "./emails",
	public: "./public",
} satisfies Required<ResourceDirectories>;

export const emptyResourceFiles = (): ResourceFiles => ({
	migrations: [],
	seeds: [],
	translations: [],
	emails: [],
	public: [],
});
