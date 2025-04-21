import logRoute from "./middleware/log-route.js";
import validateBody from "./middleware/validate-body.js";
import validateParams from "./middleware/validate-params.js";
import validateQuery from "./middleware/validate-query.js";
import authenticate from "./middleware/authenticate.js";
import validateCSRF from "./middleware/validate-csrf.js";
import permissions from "./middleware/permissions.js";
import contentLocale from "./middleware/content-locale.js";
import clientAuthentication from "./middleware/client-authenticate.js";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type z from "zod";
import type { Permission } from "../../types/response.js";
import type { RouteController, ControllerSchema } from "../../types/types.js";

type Route = <
	ParamsT extends z.ZodType | undefined,
	BodyT extends z.ZodType | undefined,
	QueryT extends z.ZodType | undefined,
	QueryFT extends z.ZodType | undefined,
>(
	fastify: FastifyInstance,
	opts: {
		method: "get" | "post" | "put" | "delete" | "patch";
		url: string;
		permissions?: Permission[];
		middleware?: {
			authenticate?: boolean;
			validateCSRF?: boolean;
			contentLocale?: boolean;
			clientAuthentication?: boolean;
		};
		zodSchema?: ControllerSchema;
		swaggerSchema?: Record<string, unknown>;
		bodyLimit?: number;
		controller: RouteController<ParamsT, BodyT, QueryT, QueryFT>;
	},
) => void;

type PreHookT = Array<
	(request: FastifyRequest, reply: FastifyReply) => Promise<void>
>;

const route: Route = (fastify, opts) => {
	const preValidation: PreHookT = [];
	const preHandler: PreHookT = [logRoute("prehandler")];

	if (opts.middleware?.authenticate) preHandler.push(authenticate);
	if (opts.middleware?.clientAuthentication)
		preHandler.push(clientAuthentication);
	if (opts.middleware?.validateCSRF) preHandler.push(validateCSRF);
	if (opts.middleware?.contentLocale) preHandler.push(contentLocale);

	if (opts.zodSchema?.body !== undefined)
		preValidation.push(validateBody(opts.zodSchema.body));
	if (opts.zodSchema?.params !== undefined)
		preValidation.push(validateParams(opts.zodSchema.params));
	if (opts.zodSchema?.query?.formatted !== undefined)
		preValidation.push(validateQuery(opts.zodSchema.query.formatted));
	if (opts.permissions) preHandler.push(permissions(opts.permissions));

	fastify.route({
		method: opts.method,
		url: opts.url,
		// @ts-expect-error - comes from "& { formattedQuery }" on the RouteController
		handler: opts.controller,
		preValidation: preValidation,
		preHandler: preHandler,
		schema: opts.swaggerSchema,
		onResponse: [logRoute("onResponse")],
		bodyLimit: opts.bodyLimit,
	});
};

export default route;
