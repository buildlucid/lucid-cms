import type { LucidHonoContext } from "@lucidcms/core/types";
import { createKiln, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test } from "vitest";
import footer from "../engine/functions/footer.js";
import { pageMarkup } from "../engine/page-markup.js";
import templateTypes from "../engine/template-types.js";
import type { SiteState } from "../types.js";
import type { Site } from "./create-site-loader.js";
import renderErrorPage from "./render-error-page.js";

describe("renderErrorPage", () => {
	test("writes the footer the failed page already wrote", async () => {
		const kiln = createKiln<SiteState>({
			loader: memoryLoader({
				"pages/page.kiln": "{{ footer() }}",
				"pages/_500.kiln": "{{ footer() }}",
			}),
			functions: { footer },
			types: templateTypes,
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
