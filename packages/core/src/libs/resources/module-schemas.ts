import z from "zod";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { isCollectionBuilder } from "../collection/builders/collection-builder/index.js";
import type { TableDefinition } from "../db/client/table/definition.js";
import type { ExternalMigration } from "../db/types.js";
import { hookExecutionKinds } from "../hooks/hook-map.js";
import type { AllHooks } from "../hooks/types.js";
import type { LucidCustomRouteDefinition } from "../http/types.js";
import { isJobDefinition } from "../jobs/registry.js";
import type { AnyJobDefinition } from "../jobs/types.js";
import type { Seed } from "../seed/types.js";

const handler = z.custom<(...args: never[]) => unknown>(
	(value) => typeof value === "function",
);

const routeShape = z.looseObject({
	method: z.enum(["get", "post", "put", "patch", "delete", "options"]),
	path: z.string().startsWith("/"),
	handler,
	order: z.number().optional(),
	middleware: z.array(handler).optional(),
});

const routeAccessSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("public") }),
	z.object({ type: z.literal("authenticated") }),
	z.object({
		type: z.literal("scoped"),
		scopes: z.union([handler, z.array(z.string()).min(1)]),
	}),
]);

const hookShape = z.strictObject({
	service: z.string(),
	event: z.string(),
	handler,
	order: z.number().optional(),
});

const hookEvents = new Map(
	Object.entries(hookExecutionKinds).map(([service, events]) => [
		service,
		new Set(Object.keys(events)),
	]),
);

export const collectionSchema = z.custom<CollectionBuilder>(
	isCollectionBuilder,
	{ error: "Expected a CollectionBuilder" },
);

export const routeSchema = z.custom<LucidCustomRouteDefinition>(
	(value) => {
		const parsed = routeShape.safeParse(value);
		if (!parsed.success) return false;
		if (parsed.data.type === undefined) return true;
		if (parsed.data.type !== "content-route") return false;
		return routeAccessSchema.safeParse(parsed.data.access).success;
	},
	{ error: "Expected defineRoute() or defineContentApiRoute()" },
);

export const hookSchema = z.custom<AllHooks>(
	(value) => {
		const parsed = hookShape.safeParse(value);
		if (!parsed.success) return false;
		return hookEvents.get(parsed.data.service)?.has(parsed.data.event) ?? false;
	},
	{ error: "Expected defineHook() with a supported service and event" },
);

export const jobSchema = z.custom<AnyJobDefinition>(isJobDefinition, {
	error: "Expected defineJob()",
});

export const migrationSchema = z.object({
	up: z.custom<ExternalMigration["up"]>((value) => typeof value === "function"),
	down: z
		.custom<NonNullable<ExternalMigration["down"]>>(
			(value) => typeof value === "function",
		)
		.optional(),
}) satisfies z.ZodType<ExternalMigration>;

export const seedSchema = z.custom<Seed>(
	(value) => typeof value === "function",
	{ error: "Expected defineSeed()" },
);

export const tableSchema = z.custom<TableDefinition>(
	(data) =>
		typeof data === "object" &&
		data !== null &&
		"name" in data &&
		typeof data.name === "string" &&
		data.name.trim().length > 0 &&
		"resolve" in data &&
		typeof data.resolve === "function",
	{ error: "Expected a table definition created with defineTable" },
);
