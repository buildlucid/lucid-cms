import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import { createServer, type ViteDevServer } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";
import getPaths from "./get-paths.js";
import type { Config, ServiceResponse } from "../../../types.js";

//* while plugins dont support registering custom components this is not used. This will need proper error handling, logging and config etc.
const createDevServer = async (
	config: Config,
): ServiceResponse<ViteDevServer> => {
	try {
		const paths = getPaths(config);

		const [clientMountRes, clientHtmlRes] = await Promise.all([
			generateClientMount(config),
			generateHTML(config),
		]);
		if (clientHtmlRes.error) return clientHtmlRes;
		if (clientMountRes.error) return clientMountRes;

		const server = await createServer({
			plugins: [tailwindcss(), solidPlugin()],
			root: paths.clientDirectory,
			server: {
				port: constants.vite.port,
			},
			base: "/admin",
			// logLevel: 'silent',
		});

		await server.listen();

		return {
			data: server,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error ? err.message : T("vite_build_error_message"),
			},
		};
	}
};

export default createDevServer;
