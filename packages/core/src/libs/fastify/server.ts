import Fastify from "fastify";
import lucidPlugin from "./plugins/lucid.js";
import logger from "../../utils/logging/index.js";
import { serverStarted } from "../../utils/logging/lucid-startup-logs.js";
import constants from "../../constants/constants.js";
import type { Config } from "../../types.js";

const start = async (config: {
	port?: number;
	host?: string;
	lucidConfig: Config;
}) => {
	const port = config?.port || 8080;
	const host = config?.host || "localhost";

	const startTime = process.hrtime();
	const fastify = Fastify({
		ajv: {
			customOptions: {
				allowMatchingProperties: true,
				strict: false,
			},
		},
	});

	await fastify.register(lucidPlugin, {
		config: config?.lucidConfig,
	});

	fastify.listen(
		{
			port: port,
			host: host,
		},
		(err, address) => {
			if (err) {
				logger("error", {
					message: err?.message,
					scope: constants.logScopes.lucid,
				});
				process.exit(1);
			}

			serverStarted(address, startTime);
		},
	);

	return fastify;
};

export { start };
