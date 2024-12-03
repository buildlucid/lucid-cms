import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import account from "../../../controllers/account/index.js";

const accountRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		zodSchema: account.getMe.zodSchema,
		swaggerSchema: account.getMe.swaggerSchema,
		controller: account.getMe.controller,
	});

	r(fastify, {
		method: "patch",
		url: "",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		swaggerSchema: account.updateMe.swaggerSchema,
		zodSchema: account.updateMe.zodSchema,
		controller: account.updateMe.controller,
	});

	r(fastify, {
		method: "post",
		url: "/reset-password",
		middleware: {
			validateCSRF: true,
		},
		swaggerSchema: account.sendResetPassword.swaggerSchema,
		zodSchema: account.sendResetPassword.zodSchema,
		controller: account.sendResetPassword.controller,
	});

	r(fastify, {
		method: "get",
		url: "/reset-password/:token",
		swaggerSchema: account.verifyResetPassword.swaggerSchema,
		zodSchema: account.verifyResetPassword.zodSchema,
		controller: account.verifyResetPassword.controller,
	});

	r(fastify, {
		method: "patch",
		url: "/reset-password/:token",
		middleware: {
			validateCSRF: true,
		},
		swaggerSchema: account.resetPassword.swaggerSchema,
		zodSchema: account.resetPassword.zodSchema,
		controller: account.resetPassword.controller,
	});
};

export default accountRoutes;
