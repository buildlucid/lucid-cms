import type { FastifyInstance } from "fastify";
import cdnRoutes from "./cdn.routes.js";

const routes = async (fastify: FastifyInstance) => {
	fastify.register(cdnRoutes);
};

export default routes;
