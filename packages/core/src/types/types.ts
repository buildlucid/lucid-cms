import type z from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Config } from "./config.js";
import type lucidServices from "../services/index.js";
import type { UserPermissionsResponse, LocalesResponse } from "./response.js";
import type logger from "../utils/logging/index.js";

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
	}
}

export type RouteController<
	P extends z.ZodTypeAny | undefined,
	B extends z.ZodTypeAny | undefined,
	Q extends z.ZodTypeAny | undefined,
> = (
	request: FastifyRequest<{
		// @ts-expect-error
		Params: z.infer<P>;
		// @ts-expect-error
		Body: z.infer<B>;
		// @ts-expect-error
		Querystring: z.infer<Q>;
	}>,
	reply: FastifyReply,
) => void;
