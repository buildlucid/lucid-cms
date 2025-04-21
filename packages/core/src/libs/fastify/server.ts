import Fastify from "fastify";
import lucidPlugin from "./plugins/lucid.js";
import logger from "../../utils/logging/index.js";
import { serverStarted } from "../../utils/logging/lucid-startup-logs.js";
import constants from "../../constants/constants.js";

const startTime = process.hrtime();
const fastify = Fastify({
	ajv: {
		customOptions: {
			allowMatchingProperties: true,
			strict: false,
		},
	},
});

fastify.register(lucidPlugin);

const start = async (config?: {
	port?: number;
	host?: string;
}) => {
	const port = config?.port || 8080;
	const host = config?.host || "localhost";

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
};

export { start, fastify };
