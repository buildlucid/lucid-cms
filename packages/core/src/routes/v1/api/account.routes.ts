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
		controller: account.getMe.controller,
	});

	r(fastify, {
		method: "patch",
		url: "",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		zodSchema: account.updateMe.zodSchema,
		controller: account.updateMe.controller,
	});

	r(fastify, {
		method: "post",
		url: "/reset-password",
		middleware: {
			validateCSRF: true,
		},
		zodSchema: account.sendResetPassword.zodSchema,
		controller: account.sendResetPassword.controller,
	});

	r(fastify, {
		method: "get",
		url: "/reset-password/:token",
		zodSchema: account.verifyResetPassword.zodSchema,
		controller: account.verifyResetPassword.controller,
	});

	r(fastify, {
		method: "patch",
		url: "/reset-password/:token",
		middleware: {
			validateCSRF: true,
		},
		zodSchema: account.resetPassword.zodSchema,
		controller: account.resetPassword.controller,
	});
};

export default accountRoutes;
