import { start, fastify } from "./libs/fastify/server.js";
import lucidPlugin from "./libs/fastify/plugins/lucid.js";
import config from "./libs/config/lucid-config.js";
import toolkit from "./libs/toolkit/toolkit.js";
import { LucidError } from "./utils/errors/index.js";
import logger from "./utils/logging/index.js";
import z from "zod";

export { toolkit, logger, z, LucidError, lucidPlugin };

export default {
	start,
	config,
	fastify,
};
