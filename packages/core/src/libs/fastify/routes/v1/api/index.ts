import type { FastifyInstance } from "fastify";
// API
import authRoutes from "./auth.routes.js";
import permissionRoutes from "./permissions.routes.js";
import roleRoutes from "./roles.routes.js";
import accountRoutes from "./account.routes.js";
import localeRoutes from "./locales.routes.js";
import emailRoutes from "./emails.routes.js";
import mediaRoutes from "./media.routes.js";
import settingsRoutes from "./settings.routes.js";
import collectionRoutes from "./collections.routes.js";
import collectionDocumentsRoutes from "./collection-documents.routes.js";
import userRoutes from "./users.routes.js";
import clientIntegrationRoutes from "./client-integrations.routes.js";
import clientRoutes from "./client/index.js";

const routes = async (fastify: FastifyInstance) => {
	fastify.register(authRoutes, {
		prefix: "/auth",
	});
	fastify.register(accountRoutes, {
		prefix: "/account",
	});
	fastify.register(permissionRoutes, {
		prefix: "/permissions",
	});
	fastify.register(localeRoutes, {
		prefix: "/locales",
	});
	fastify.register(collectionRoutes, {
		prefix: "/collections",
	});
	fastify.register(collectionDocumentsRoutes, {
		prefix: "/collections/documents",
	});
	fastify.register(userRoutes, {
		prefix: "/users",
	});
	fastify.register(settingsRoutes, {
		prefix: "/settings",
	});
	fastify.register(roleRoutes, {
		prefix: "/roles",
	});
	fastify.register(emailRoutes, {
		prefix: "/emails",
	});
	fastify.register(mediaRoutes, {
		prefix: "/media",
	});
	fastify.register(clientIntegrationRoutes, {
		prefix: "/client-integrations",
	});

	// Client
	fastify.register(clientRoutes, {
		prefix: "/client",
	});
};

export default routes;
