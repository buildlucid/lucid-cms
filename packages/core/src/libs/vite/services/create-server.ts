import C from "../../../constants/constants.js";
import { join } from "node:path";
import { createServer } from "vite";
import solidPlugin from "vite-plugin-solid";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";

// TODO: improve error handling

const createDevServer = async () => {
	const cwd = process.cwd();

	await Promise.all([generateClientMount(), generateHTML()]);

	const server = await createServer({
		plugins: [solidPlugin()],
		root: join(cwd, C.vite.outputDir),
		server: {
			port: C.vite.port,
		},
	});

	await server.listen();

	return server.httpServer?.address();
};

export default createDevServer;
