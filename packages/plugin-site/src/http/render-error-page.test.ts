import type { LucidHonoContext } from "@lucidcms/core/types";
import { createKiln, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test } from "vitest";
import propTypes from "../content/prop-types.js";
import footer from "../functions/footer.js";
import { pageMarkup } from "../preview/page-markup.js";
import type { Site } from "../site/create-site-loader.js";
import type { SiteState } from "../types.js";
import renderErrorPage from "./render-error-page.js";

describe("renderErrorPage", () => {
	test("writes the footer the failed page already wrote", async () => {
		const kiln = createKiln<SiteState>({
			loader: memoryLoader({
				"pages/page.kiln": "{{ footer() }}",
				"pages/_500.kiln": "{{ footer() }}",
			}),
			functions: { footer },
			types: propTypes,
		});
		const site = {
			templates: new Set(["pages/_500.kiln"]),
			kiln,
		} as unknown as Site;
		const hono = {
			html: (html: string, status: number) => ({ html, status }),
		} as unknown as LucidHonoContext;
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
		});
	});
});
