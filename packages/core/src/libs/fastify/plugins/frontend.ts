import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import constants from "../../../constants/constants.js";

const lucidFrontend = async (fastify: FastifyInstance) => {};

export default fp(lucidFrontend, {
	name: "@lucidcms/frontend",
	fastify: constants.fastify.version,
});
