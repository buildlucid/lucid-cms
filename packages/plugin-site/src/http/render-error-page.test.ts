import type { LucidHonoContext } from "@lucidcms/core/types";
import { createKiln, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test } from "vitest";
import propTypes from "../content/prop-types.js";
import footer from "../functions/footer.js";
import { pageMarkup } from "../preview/page-markup.js";
import type { Site } from "../site/create-site-loader.js";
import type { SiteState } from "../types.js";
import renderErrorPage from "./render-error-page.js";

const kiln = createKiln<SiteState>({
	loader: memoryLoader({
		"pages/page.kiln": "{{ footer() }}",
		"pages/_404.kiln": "Not found",
		"pages/_500.kiln": "{{ footer() }}",
	}),
	functions: { footer },
	types: propTypes,
});
const site = {
	templates: new Set(["pages/_404.kiln", "pages/_500.kiln"]),
	kiln,
} as unknown as Site;
const hono = {
	html: (html: string, status: number, headers?: Record<string, string>) => ({
		html,
		status,
		headers,
	}),
} as unknown as LucidHonoContext;

describe("renderErrorPage", () => {
	test("writes the footer the failed page already wrote", async () => {
		const state = { path: "/", preview: null } as SiteState;
		pageMarkup.set(state, {
			head: "",
			footer: "<lucid-toolbar></lucid-toolbar>",
			footerWritten: false,
		});

		await kiln.render("pages/page.kiln", {}, { state });
		await expect(
			renderErrorPage({
				hono,
				site,
				state,
				template: "pages/_500.kiln",
				status: 500,
			}),
		).resolves.toEqual({
			html: "<lucid-toolbar></lucid-toolbar>",
			status: 500,
			headers: undefined,
		});
	});

	test("sends the cache-control it's given, so CDNs can keep 404 pages", async () => {
		await expect(
			renderErrorPage({
				hono,
				site,
				state: { path: "/missing", preview: null } as SiteState,
				template: "pages/_404.kiln",
				status: 404,
				cacheControl: "public, s-maxage=60",
			}),
		).resolves.toEqual({
			html: "Not found",
			status: 404,
			headers: { "cache-control": "public, s-maxage=60" },
		});
	});
});
