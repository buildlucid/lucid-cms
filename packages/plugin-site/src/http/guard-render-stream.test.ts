import { logger } from "@lucidcms/core";
import { createKiln, memoryLoader } from "@lucidkiln/core";
import { afterEach, describe, expect, test, vi } from "vitest";
import propTypes from "../content/prop-types.js";
import notFound from "../functions/not-found.js";
import guardRenderStream from "./guard-render-stream.js";

const kiln = createKiln({
	types: propTypes,
	loader: memoryLoader({
		"page.kiln": "<p>Hi</p>{% flush %}{{ fail() }}",
		"missing.kiln": "<p>Hi</p>{% flush %}{{ notFound() }}",
	}),
	functions: {
		notFound,
		// Fails like a data read would, after the flushed part has been sent.
		fail: async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			throw new Error("Boom");
		},
	},
});

const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);
const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

const guard = async (template: string, development: boolean) =>
	guardRenderStream(await kiln.renderStream(template), {
		path: "/",
		development,
		data: { kind: "dev", prefix: "", revision: "test" },
		signal: new AbortController().signal,
	});

describe("guardRenderStream", () => {
	afterEach(() => {
		error.mockClear();
		warn.mockClear();
	});

	test("logs a failure after the response started and shows the error page in development", async () => {
		const html = await new Response(await guard("page.kiln", true)).text();

		expect(html).toMatch(/^<p>Hi<\/p>/);
		expect(html).toContain("500 · Render error");
		expect(html).toContain("threw an error: Boom");
		expect(error).toHaveBeenCalledWith(
			expect.objectContaining({ event: "plugin-site.render.failed" }),
		);
		expect(warn).not.toHaveBeenCalled();
	});

	test("explains that notFound() after a flush can't change the status", async () => {
		await new Response(await guard("missing.kiln", true)).text();

		expect(warn).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "plugin-site.render.late-status",
				message: expect.stringContaining("notFound()"),
			}),
		);
	});

	test("cuts the response off in production, so nothing caches a broken page", async () => {
		await expect(
			new Response(await guard("page.kiln", false)).text(),
		).rejects.toThrow("Boom");
		expect(error).toHaveBeenCalledTimes(1);
	});
});
