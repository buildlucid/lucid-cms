import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import auth from "../../../controllers/auth/index.js";

const authRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/csrf",
		zodSchema: auth.getCSRF.zodSchema,
		swaggerSchema: auth.getCSRF.swaggerSchema,
		controller: auth.getCSRF.controller,
	});

	r(fastify, {
		method: "post",
		url: "/token",
		middleware: {
			validateCSRF: true,
			// Does have the authenticate middleware because all it does it checks if the access token is valid
			// and if it is it will return the user data, this handles authorisatio itsself via the refresh token.
		},
		zodSchema: auth.token.zodSchema,
		swaggerSchema: auth.token.swaggerSchema,
		controller: auth.token.controller,
	});

	r(fastify, {
		method: "post",
		url: "/login",
		middleware: {
			validateCSRF: true,
		},
		zodSchema: auth.login.zodSchema,
		swaggerSchema: auth.login.swaggerSchema,
		controller: auth.login.controller,
	});

	r(fastify, {
		method: "post",
		url: "/logout",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: auth.logout.zodSchema,
		swaggerSchema: auth.logout.swaggerSchema,
		controller: auth.logout.controller,
	});
};

export default authRoutes;
