import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import logger from "../../logger/index.js";
import logRoute from "./log-route.js";

test("routes with parameters log their pattern, so tokens in paths stay out of logs", async () => {
	const info = vi.spyOn(logger, "info").mockImplementation(() => undefined);
	const app = new Hono<LucidHonoGeneric>()
		.use(logRoute)
		.get("/magic-link/validate/:token", (c) => c.body(null, 204))
		.get("/pages/*", (c) => c.body(null, 204));

	await app.request("/magic-link/validate/secret-token");
	await app.request("/pages/about");

	expect(info.mock.calls.map(([entry]) => entry.data?.path)).toEqual([
		"/magic-link/validate/:token",
		"/pages/about",
	]);
	expect(JSON.stringify(info.mock.calls)).not.toContain("secret-token");
	info.mockRestore();
});
