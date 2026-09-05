import type { Hono, MiddlewareHandler, Next, TypedResponse } from "hono";
import type { DescribeRouteOptions } from "hono-openapi";
import type z from "zod";
import type { Config } from "../../types/config.js";
import type { LucidHonoContext, LucidHonoGeneric } from "../../types/hono.js";
import type { RouteSchema } from "../../types/schema.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type {
	ExternalPrincipalType,
	ExternalScope,
} from "../permission/external-scopes.js";
import type { Toolkit } from "../toolkit/types.js";

export type HttpExtensionRegister = (
	app: Hono<LucidHonoGeneric>,
	config: Config,
) => void | Promise<void>;

export type HttpExtensionPriority = 0 | 1 | 2;

export type HttpExtension = {
	name: string;
	priority: HttpExtensionPriority;
	register: HttpExtensionRegister;
};

export type LucidRouteMethod =
	| "get"
	| "post"
	| "put"
	| "patch"
	| "delete"
	| "options";

type InferSchemaValue<T> = T extends z.ZodType ? z.infer<T> : undefined;

type InferRouteQuery<TSchema> = TSchema extends {
	query: {
		formatted?: infer FormattedSchema;
		string?: infer StringSchema;
	};
}
	? FormattedSchema extends z.ZodType
		? z.infer<FormattedSchema>
		: StringSchema extends z.ZodType
			? z.infer<StringSchema>
			: undefined
	: undefined;

export type LucidRouteInput<TSchema> = {
	body: TSchema extends { body: infer BodySchema }
		? InferSchemaValue<BodySchema>
		: undefined;
	params: TSchema extends { params: infer ParamsSchema }
		? InferSchemaValue<ParamsSchema>
		: undefined;
	query: InferRouteQuery<TSchema>;
};

export type LucidRouteHandlerResponse =
	| Response
	| TypedResponse<unknown>
	| undefined
	| Promise<Response | TypedResponse<unknown> | undefined>
	| Promise<void>;

export type LucidRouteHandler<TSchema> = (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	toolkit: Toolkit;
	input: LucidRouteInput<TSchema>;
}) => LucidRouteHandlerResponse;

export type LucidMiddlewareHandler = (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	toolkit: Toolkit;
	next: Next;
}) => Response | undefined | Promise<Response | undefined> | Promise<void>;

export type LucidRouteMiddleware = MiddlewareHandler<LucidHonoGeneric>;

export type LucidRouteDefinitionInput<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = {
	/** Lower priorities register first. Defaults to zero. */
	priority?: number;
	method: LucidRouteMethod;
	path: string;
	schema?: TSchema;
	middleware?: LucidRouteMiddleware[];
	openAPI?: DescribeRouteOptions;
	handler: LucidRouteHandler<TSchema>;
};

export type LucidRouteDefinition<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = LucidRouteDefinitionInput<TSchema>;

export type LucidContentRouteScopes = readonly [
	ExternalScope,
	...ExternalScope[],
];

export type LucidContentRouteAccess =
	| {
			type: "public";
	  }
	| {
			type: "authenticated";
			principalType?: ExternalPrincipalType;
	  }
	| {
			type: "scoped";
			principalType?: ExternalPrincipalType;
			scopes:
				| LucidContentRouteScopes
				| ((props: { hono: LucidHonoContext }) => LucidContentRouteScopes);
	  };

export type LucidContentRouteDefinitionInput<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = Omit<LucidRouteDefinitionInput<TSchema>, "path"> & {
	/** Path relative to `/lucid/api/v1/content`. */
	path: `/${string}`;
	/** External access required before the route handler can run. */
	access: LucidContentRouteAccess;
};

export type LucidContentRouteDefinition<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = LucidContentRouteDefinitionInput<TSchema> & {
	readonly type: "content-route";
};

export type LucidCustomRouteDefinition<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = LucidRouteDefinition<TSchema> | LucidContentRouteDefinition<TSchema>;
