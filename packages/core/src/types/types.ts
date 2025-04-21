import type z from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Config } from "./config.js";
import type lucidServices from "../services/index.js";
import type { UserPermissionsResponse, LocalesResponse } from "./response.js";
import type logger from "../utils/logging/index.js";
import type { QueryParams } from "./query-params.js";

declare module "fastify" {
	interface FastifyInstance {
		config: Config;
		logger: typeof logger;
		services: typeof lucidServices;
	}

	interface FastifyRequest {
		auth: {
			id: number;
			username: string;
			email: string;
			superAdmin: boolean;
			permissions: UserPermissionsResponse["permissions"] | undefined;
		};
		locale: {
			code: LocalesResponse["code"];
		};
		server: FastifyInstance;
		clientIntegrationAuth: {
			id: number;
			key: string;
		};
		formattedQuery: QueryParams;
	}
}

export type RouteController<
	P extends z.ZodType | undefined,
	B extends z.ZodType | undefined,
	Q extends z.ZodType | undefined,
	F extends z.ZodType | undefined = undefined,
> = (
	request: FastifyRequest<{
		// @ts-expect-error
		Params: z.infer<P>;
		// @ts-expect-error
		Body: z.infer<B>;
		// @ts-expect-error
		Querystring: z.infer<Q>;
	}> & {
		formattedQuery: F extends z.ZodType ? z.infer<F> : z.ZodType;
	},
	reply: FastifyReply,
) => void;

export type ControllerSchema = {
	query: {
		string: z.ZodType | undefined;
		formatted: z.ZodType | undefined;
	};
	params: z.ZodType | undefined;
	body: z.ZodType | undefined;
	response: z.ZodType | undefined;
};
