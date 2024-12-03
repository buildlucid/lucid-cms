import type { FastifyInstance } from "fastify";
// API
import clientDocumentsRoutes from "./documents.routes.js";
import clientLocalesRoutes from "./locales.routes.js";

const clientRoutes = async (fastify: FastifyInstance) => {
	fastify.register(clientDocumentsRoutes);
	fastify.register(clientLocalesRoutes, {
		prefix: "/locales",
	});
};

export default clientRoutes;
