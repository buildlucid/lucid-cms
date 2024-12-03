import type { FastifyInstance } from "fastify";
import r from "../../../utils/route.js";
import emails from "../../../controllers/email/index.js";

const emailsRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "get",
		url: "/:id",
		middleware: {
			authenticate: true,
		},
		permissions: ["read_email"],
		zodSchema: emails.getSingle.zodSchema,
		controller: emails.getSingle.controller,
	});

	r(fastify, {
		method: "get",
		url: "",
		middleware: {
			authenticate: true,
		},
		permissions: ["read_email"],
		zodSchema: emails.getMultiple.zodSchema,
		controller: emails.getMultiple.controller,
	});

	r(fastify, {
		method: "delete",
		url: "/:id",
		middleware: {
			authenticate: true,
		},
		permissions: ["delete_email"],
		zodSchema: emails.deleteSingle.zodSchema,
		controller: emails.deleteSingle.controller,
	});

	r(fastify, {
		method: "post",
		url: "/:id/resend",
		middleware: {
			authenticate: true,
			validateCSRF: true,
		},
		permissions: ["send_email"],
		zodSchema: emails.resendSingle.zodSchema,
		controller: emails.resendSingle.controller,
	});
};

export default emailsRoutes;
