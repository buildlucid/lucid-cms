import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import defineDriver from "./define-driver.ts";
import type { DatabaseLocation } from "./types.ts";

type SqliteState = { file: string };

const prepare = async (location: DatabaseLocation): Promise<string> => {
	await mkdir(location.directory, { recursive: true });
	return path.join(location.directory, `${location.name}.sqlite`);
};

/** SQLite in a temporary file, which is copied to clone it. */
const sqliteDriver = defineDriver<SqliteState>({
	key: "sqlite",
	capabilities: {},
	createTemplate: async (location) => {
		const file = await prepare(location);
		return {
			url: file,
			//* everything that wrote to it has exited by now, so the file is complete
			seal: async () => ({ file }),
			discard: () => rm(file, { force: true }),
		};
	},
	clone: async (state, location) => {
		const file = await prepare(location);
		await copyFile(state.file, file);
		return {
			url: file,
			destroy: async () => {
				await Promise.all(
					["", "-wal", "-shm"].map((suffix) =>
						rm(`${file}${suffix}`, { force: true }),
					),
				);
			},
		};
	},
	destroyTemplate: async (state) => {
		await rm(state.file, { force: true });
	},
});

export default sqliteDriver;
