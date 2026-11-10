import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import defineDriver from "./define-driver.ts";

type PGliteState = { dump: string };

/** How many clients may be connected at once, such as a server and the harness. */
const MAX_CONNECTIONS = 10;

/** Serves a PGlite instance over the Postgres protocol on a free local port. */
const serve = async (db: PGlite) => {
	const server = new PGLiteSocketServer({
		db,
		port: 0,
		host: "127.0.0.1",
		maxConnections: MAX_CONNECTIONS,
	});
	await server.start();
	const port = server.getServerConn().split(":").at(-1);

	return {
		//* every connection shares PGlite's one session, so a pool of one stops transactions mixing
		url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres?max=1`,
		stop: async () => {
			await server.stop();
			await db.close();
		},
	};
};

/**
 * Postgres in memory through PGlite, with no Docker or server to install.
 * It lives in the process that creates it, and is one session shared by every connection, so
 * it cannot show how separate connections block or race each other.
 */
const pgliteDriver = defineDriver<PGliteState>({
	key: "pglite",
	capabilities: { remove: ["database.concurrentWrites"] },
	createTemplate: async (location) => {
		const db = await PGlite.create();
		const served = await serve(db);

		return {
			url: served.url,
			seal: async () => {
				const dump = path.join(location.directory, `${location.name}.tar`);
				await mkdir(location.directory, { recursive: true });
				const archive = await db.dumpDataDir("none");
				await writeFile(dump, Buffer.from(await archive.arrayBuffer()));
				await served.stop();
				return { dump };
			},
			discard: served.stop,
		};
	},
	clone: async (state) => {
		const db = await PGlite.create({
			loadDataDir: new Blob([await readFile(state.dump)]),
		});
		const served = await serve(db);

		return { url: served.url, destroy: served.stop };
	},
	destroyTemplate: async (state) => {
		await rm(state.dump, { force: true });
	},
});

export default pgliteDriver;
