import type { Hono, MiddlewareHandler, Next, TypedResponse } from "hono";
import type { DescribeRouteOptions } from "hono-openapi";
import type z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { LucidHonoContext, LucidHonoGeneric } from "../../types/hono.js";
import type { RouteSchema } from "../../types/schema.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type {
	ExternalPrincipalType,
	ExternalScope,
} from "../permission/external-scopes.js";
import type { Toolkit } from "../toolkit/types.js";

/** Register middleware or routes on the app using resolved config. Async registration is awaited. */
export type HttpExtensionRegister = (
	app: Hono<LucidHonoGeneric>,
	config: ResolvedLucidConfig,
) => void | Promise<void>;

/** Registration timing: before core middleware, after routes, or after the full HTTP app setup. */
export type HttpExtensionPhase =
	| "beforeMiddleware"
	| "afterRoutes"
	| "afterSetup";

/** An app registration callback with an explicit lifecycle phase. */
export type HttpExtension = {
	/** Name used to identify the extension. */
	name: string;
	/** Register before middleware, after routes, or after HTTP setup is complete. */
	phase: HttpExtensionPhase;
	/** Add middleware or routes at the selected phase. */
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

/** Validated body, path parameters and query. Parts without a schema are undefined. */
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

/** Receives the Hono context, service context, toolkit and validated input. Return the HTTP response. */
export type LucidRouteHandler<TSchema> = (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	toolkit: Toolkit;
	input: LucidRouteInput<TSchema>;
}) => LucidRouteHandlerResponse;

/** Receives request helpers and `next`. Await `next()` to continue, or return a response to stop the chain. */
export type LucidMiddlewareHandler = (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	toolkit: Toolkit;
	next: Next;
}) => Response | undefined | Promise<Response | undefined> | Promise<void>;

export type LucidRouteMiddleware = MiddlewareHandler<LucidHonoGeneric>;

/** Route settings accepted by `defineRoute`. Authentication must be added explicitly. */
export type LucidRouteDefinitionInput<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = {
	/** Lower values register first. Defaults to zero. */
	order?: number;
	method: LucidRouteMethod;
	/** Route path, including any Hono path parameters such as /articles/:id. */
	path: string;
	/** Schemas used to validate request input before the handler. */
	schema?: TSchema;
	/** Middleware to run in array order before the handler. */
	middleware?: LucidRouteMiddleware[];
	/** OpenAPI operation metadata for this route. */
	openAPI?: DescribeRouteOptions;
	/** Produce the route response from validated input. */
	handler: LucidRouteHandler<TSchema>;
};

export type LucidRouteDefinition<
	TSchema extends RouteSchema | undefined = RouteSchema | undefined,
> = LucidRouteDefinitionInput<TSchema>;

export type LucidContentRouteScopes = readonly [
	ExternalScope,
	...ExternalScope[],
];

/** Public access, any valid external credential, or a credential with every required scope. */
export type LucidContentRouteAccess =
	| {
			type: "public";
	  }
	| {
			type: "authenticated";
			/** Restrict access to user or system credentials. Omission allows either. */
			principalType?: ExternalPrincipalType;
	  }
	| {
			type: "scoped";
			/** Restrict access to user or system credentials. Omission allows either. */
			principalType?: ExternalPrincipalType;
			scopes:
				| LucidContentRouteScopes
				| ((props: { hono: LucidHonoContext }) => LucidContentRouteScopes);
	  };

/** A route beneath the content API with explicit external access requirements. */
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
