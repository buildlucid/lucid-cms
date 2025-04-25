import type { FastifyInstance } from "fastify";
import T from "../../translations/index.js";

const refs = {
	defaultError: "DefaultError",
} as const;

const defaultErrorResponse = {
	$id: refs.defaultError,
	type: "object",
	description: T("swagger_response_default"),
	properties: {
		status: {
			type: "number",
			nullable: true,
		},
		code: {
			type: "string",
			nullable: true,
		},
		name: {
			type: "string",
			nullable: true,
		},
		message: {
			type: "string",
			nullable: true,
		},
		errors: {
			type: "object",
			nullable: true,
			additionalProperties: true,
		},
	},
	additionalProperties: true,
} as const;

export const swaggerRegisterRefs = (fastify: FastifyInstance) => {
	fastify.addSchema(defaultErrorResponse);
};

export default refs;
