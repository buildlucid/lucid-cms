import type { Hono, MiddlewareHandler, Next, TypedResponse } from "hono";
import type { DescribeRouteOptions } from "hono-openapi";
import type z from "zod";
import type { Config } from "../../types/config.js";
import type { LucidHonoContext, LucidHonoGeneric } from "../../types/hono.js";
import type { RouteSchema } from "../../types/schema.js";
import type { ServiceContext } from "../../utils/services/types.js";

export type HttpAppHook = (
	app: Hono<LucidHonoGeneric>,
	config: Config,
) => void | Promise<void>;

export type HttpHooks = {
	beforeCore: HttpAppHook[];
	afterCore: HttpAppHook[];
	afterOpenAPI: HttpAppHook[];
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
	input: LucidRouteInput<TSchema>;
}) => LucidRouteHandlerResponse;

export type LucidMiddlewareHandler = (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	next: Next;
}) => Response | undefined | Promise<Response | undefined> | Promise<void>;

export type LucidRouteMiddleware = MiddlewareHandler<LucidHonoGeneric>;

export type LucidRouteDefinitionInput<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = {
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
