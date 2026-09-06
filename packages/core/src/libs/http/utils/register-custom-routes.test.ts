import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import { LucidAPIError, LucidError } from "../../../utils/errors/index.js";
import defineContentApiRoute from "../define-content-api-route.js";
import defineRoute from "../define-route.js";
import type { LucidRouteHandler } from "../types.js";
import registerCustomRoutes from "./register-custom-routes.js";

vi.mock("./create-service-context.js", () => ({
	default: () => ({
		config: { plugins: [] },
		request: { url: "http://localhost:6543" },
	}),
}));

const runtimeContext = {
	runtime: "test",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
};

describe("registerCustomRoutes", () => {
	test("uses order to register a specific route before a catch-all", async () => {
		const app = new Hono<LucidHonoGeneric>();
		registerCustomRoutes(app, [
			defineRoute({
				method: "get",
				path: "/*",
				order: 10,
				handler: ({ hono }) => hono.text("fallback"),
			}),
			defineRoute({
				method: "get",
				path: "/specific",
				handler: ({ hono }) => hono.text("specific"),
			}),
		]);
		expect(await (await app.request("/specific")).text()).toBe("specific");
		expect(await (await app.request("/elsewhere")).text()).toBe("fallback");
	});

	test("mounts public content routes beneath the content endpoint", async () => {
		const app = new Hono<LucidHonoGeneric>();
		registerCustomRoutes(app, [
			defineContentApiRoute({
				method: "get",
				path: "/hello",
				access: { type: "public" },
				handler: ({ hono }) => hono.json({ message: "hello" }),
			}),
		]);

		const response = await app.request("/lucid/api/v1/content/hello");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ message: "hello" });
	});

	test("authenticates protected content routes before their handler", async () => {
		const handler = vi.fn<LucidRouteHandler<undefined>>(({ hono }) =>
			hono.text("protected"),
		);
		const app = new Hono<LucidHonoGeneric>();
		let caughtError: Error | undefined;
		app.use("*", async (hono, next) => {
			hono.set("runtimeContext", runtimeContext);
			await next();
		});
		app.onError((error, hono) => {
			caughtError = error;
			return hono.text("unauthorised", 401);
		});
		registerCustomRoutes(app, [
			defineContentApiRoute({
				method: "get",
				path: "/protected",
				access: { type: "authenticated" },
				handler,
			}),
		]);

		const response = await app.request("/lucid/api/v1/content/protected");

		expect(response.status).toBe(401);
		expect(caughtError).toBeInstanceOf(LucidAPIError);
		expect(handler).not.toHaveBeenCalled();
	});

	test("rejects a content route that shadows an existing route", () => {
		const app = new Hono<LucidHonoGeneric>();
		app.get("/lucid/api/v1/content/hello", (hono) => hono.text("core"));

		expect(() =>
			registerCustomRoutes(app, [
				defineContentApiRoute({
					method: "get",
					path: "/hello",
					access: { type: "public" },
					handler: ({ hono }) => hono.text("custom"),
				}),
			]),
		).toThrow(LucidError);
	});

	test("checks configured content-route collisions before registering routes", () => {
		const app = new Hono<LucidHonoGeneric>();

		expect(() =>
			registerCustomRoutes(app, [
				defineContentApiRoute({
					method: "get",
					path: "/hello",
					access: { type: "public" },
					handler: ({ hono }) => hono.text("content"),
				}),
				defineRoute({
					method: "get",
					path: "/lucid/api/v1/content/hello",
					handler: ({ hono }) => hono.text("custom"),
				}),
			]),
		).toThrow('Route "GET /lucid/api/v1/content/hello" is already registered.');
		expect(app.routes).toHaveLength(0);
	});

	test.each([
		["/documents/:collectionKey", "/documents/:slug"],
		["/documents/:collectionKey{[a-z]+}", "/documents/:slug{[a-z]+}"],
	] as const)("rejects equivalent parameterised routes: %s", (existing, custom) => {
		const app = new Hono<LucidHonoGeneric>();
		app.get(`/lucid/api/v1/content${existing}`, (hono) => hono.text("core"));
		const originalRouteCount = app.routes.length;

		expect(() =>
			registerCustomRoutes(app, [
				defineContentApiRoute({
					method: "get",
					path: "/new-route",
					access: { type: "public" },
					handler: ({ hono }) => hono.text("new"),
				}),
				defineContentApiRoute({
					method: "get",
					path: custom,
					access: { type: "public" },
					handler: ({ hono }) => hono.text("custom"),
				}),
			]),
		).toThrow("is already registered");
		expect(app.routes).toHaveLength(originalRouteCount);
	});

	test("preserves distinct parameter constraints when checking collisions", async () => {
		const app = new Hono<LucidHonoGeneric>();
		registerCustomRoutes(app, [
			defineContentApiRoute({
				method: "get",
				path: "/lookup/:id{[0-9]+}",
				access: { type: "public" },
				handler: ({ hono }) => hono.text("numeric"),
			}),
			defineContentApiRoute({
				method: "get",
				path: "/lookup/:slug{[a-z]+}",
				access: { type: "public" },
				handler: ({ hono }) => hono.text("slug"),
			}),
		]);

		expect(
			await (await app.request("/lucid/api/v1/content/lookup/123")).text(),
		).toBe("numeric");
		expect(
			await (await app.request("/lucid/api/v1/content/lookup/pages")).text(),
		).toBe("slug");
	});
});
