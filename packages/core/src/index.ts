import { start, fastify } from "./libs/fastify/server.js";
import config from "./libs/config/lucid-config.js";

export { default as lucidPlugin } from "./libs/fastify/plugins/lucid.js";
export { default as toolkit } from "./libs/toolkit/toolkit.js";
export { LucidError } from "./utils/errors/index.js";
export { default as logger } from "./utils/logging/index.js";
export { default as z } from "zod";
export { default as DatabaseAdapter } from "./libs/db/adapter.js";

export default {
	start,
	config,
	fastify,
};
