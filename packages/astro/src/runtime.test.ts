import { describe, expect, test, vi } from "vitest";
import {
	buildLucidAdminBarEditHref,
	createLucidSpaResponse,
	maybeInjectLucidAdminBar,
	normalizeLucidAdminBarOptions,
	readLucidAdminBarContext,
	shouldInjectLucidAdminBar,
	shouldServeLucidSpaShell,
} from "./runtime.js";

describe("@lucidcms/astro runtime", () => {
	test("serves the SPA shell for Lucid client routes", () => {
		expect(shouldServeLucidSpaShell("/lucid", "GET")).toBe(true);
		expect(shouldServeLucidSpaShell("/lucid/content/entries", "HEAD")).toBe(
			true,
		);
		expect(shouldServeLucidSpaShell("/lucid/share/NpirTvp6gb5R", "GET")).toBe(
			true,
		);
	});

	test("does not serve the SPA shell for API, asset, or non-GET requests", () => {
		expect(shouldServeLucidSpaShell("/lucid/api/v1/auth", "GET")).toBe(false);
		expect(shouldServeLucidSpaShell("/lucid/openapi", "GET")).toBe(false);
		expect(shouldServeLucidSpaShell("/lucid/assets/index.js", "GET")).toBe(
			false,
		);
		expect(shouldServeLucidSpaShell("/lucid/content/entries", "POST")).toBe(
			false,
		);
		expect(shouldServeLucidSpaShell("/outside-lucid", "GET")).toBe(false);
	});

	test("creates a cache-busting HTML response for the SPA shell", async () => {
		const getResponse = createLucidSpaResponse("<html>ok</html>", "GET");
		const headResponse = createLucidSpaResponse("<html>ok</html>", "HEAD");

		expect(getResponse.status).toBe(200);
		expect(getResponse.headers.get("content-type")).toBe(
			"text/html; charset=utf-8",
		);
		expect(getResponse.headers.get("cache-control")).toBe("no-store");
		await expect(getResponse.text()).resolves.toBe("<html>ok</html>");
		await expect(headResponse.text()).resolves.toBe("");
	});

	test("normalizes admin bar options and builds edit routes", () => {
		expect(normalizeLucidAdminBarOptions()).toEqual({
			disable: false,
		});
		expect(
			buildLucidAdminBarEditHref({
				collectionKey: "page",
				documentId: 14,
			}),
		).toBe("/lucid/collections/page/latest/14");
		expect(
			buildLucidAdminBarEditHref({
				collectionKey: "page",
				documentId: 14,
				status: "revision",
				versionId: 4,
			}),
		).toBe("/lucid/collections/page/revision/14/4");
		expect(
			buildLucidAdminBarEditHref({
				collectionKey: "page/content",
				documentId: 14,
				status: "draft/review",
			}),
		).toBe("/lucid/collections/page%2Fcontent/draft%2Freview/14");
	});

	test("reads request-local admin bar metadata", () => {
		expect(
			readLucidAdminBarContext({
				__lucid_astro_admin_bar__: {
					edit: {
						collectionKey: "page",
						documentId: 22,
						status: "latest",
						label: "Edit homepage",
					},
				},
			}),
		).toEqual({
			edit: {
				collectionKey: "page",
				documentId: 22,
				status: "latest",
				versionId: undefined,
				label: "Edit homepage",
			},
		});
	});

	test("only injects the admin bar into front-end html responses", () => {
		expect(
			shouldInjectLucidAdminBar({
				pathname: "/",
				method: "GET",
				response: new Response("<html></html>", {
					headers: {
						"content-type": "text/html",
					},
				}),
			}),
		).toBe(true);
		expect(
			shouldInjectLucidAdminBar({
				pathname: "/lucid",
				method: "GET",
				response: new Response("<html></html>", {
					headers: {
						"content-type": "text/html",
					},
				}),
			}),
		).toBe(false);
	});

	test("injects dev toolbar state in dev without an authenticated session", async () => {
		const appFetch = vi.fn();
		const response = await maybeInjectLucidAdminBar({
			context: {
				locals: {
					__lucid_astro_admin_bar__: {
						edit: {
							collectionKey: "page",
							documentId: 1,
							label: "Edit homepage",
						},
					},
				},
				request: new Request("https://example.com/"),
			},
			response: new Response("<html><body><main>Page</main></body></html>", {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			}),
			options: {
				disable: false,
			},
			isDev: true,
			appFetch,
		});

		expect(appFetch).not.toHaveBeenCalled();
		const html = await response.text();
		expect(html).toContain('data-lucid-admin-bar-state="true"');
		expect(html).toContain("__lucid_astro_admin_bar_state__");
		expect(html).toContain("/lucid/collections/page/latest/1");
		expect(html).toContain("Edit homepage");
		expect(html).not.toContain('data-lucid-admin-bar="true"');
	});

	test("skips auth resolution entirely in dev", async () => {
		const appFetch = vi.fn();
		const response = await maybeInjectLucidAdminBar({
			context: {
				locals: {
					__lucid_astro_admin_bar__: {
						edit: {
							collectionKey: "page",
							documentId: 3,
						},
					},
				},
				request: new Request("https://example.com/", {
					headers: {
						cookie: "_access=test; _refresh=test",
					},
				}),
			},
			response: new Response("<html><body><main>Page</main></body></html>", {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			}),
			options: {
				disable: false,
			},
			isDev: true,
			appFetch,
		});

		expect(appFetch).not.toHaveBeenCalled();
		const html = await response.text();
		expect(html).toContain("/lucid/collections/page/latest/3");
		expect(html).not.toContain('data-lucid-admin-bar="true"');
	});

	test("renders the production pill when the request is authenticated", async () => {
		const appFetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ data: { id: 1 } }), {
					headers: {
						"content-type": "application/json",
					},
				}),
		);
		const response = await maybeInjectLucidAdminBar({
			context: {
				locals: {
					__lucid_astro_admin_bar__: {
						edit: {
							collectionKey: "page",
							documentId: 11,
							label: "Edit homepage",
						},
					},
				},
				request: new Request("https://example.com/", {
					headers: {
						cookie: "_access=test",
					},
				}),
			},
			response: new Response("<html><body><main>Page</main></body></html>", {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			}),
			options: {
				disable: false,
			},
			isDev: false,
			appFetch,
		});

		const html = await response.text();
		expect(appFetch).toHaveBeenCalledTimes(1);
		expect(html).toContain("Lucid CMS");
		expect(html).not.toContain("Logout");
		expect(html).toContain("Edit homepage");
		expect(html).toContain("/lucid/collections/page/latest/11");
	});

	test("omits the production separator when there is no edit action", async () => {
		const appFetch = vi.fn(
			async () =>
				new Response(JSON.stringify({ data: { id: 1 } }), {
					headers: {
						"content-type": "application/json",
					},
				}),
		);
		const response = await maybeInjectLucidAdminBar({
			context: {
				locals: {},
				request: new Request("https://example.com/", {
					headers: {
						cookie: "_access=test",
					},
				}),
			},
			response: new Response("<html><body><main>Page</main></body></html>", {
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			}),
			options: {
				disable: false,
			},
			isDev: false,
			appFetch,
		});

		const html = await response.text();
		expect(html).toContain("Lucid CMS");
		expect(html).not.toContain(
			'<span class="lucid-ab__sep" aria-hidden="true"></span>',
		);
		expect(html).not.toContain("Edit document");
	});

	test("skips the floating admin bar in production when unauthenticated", async () => {
		const appFetch = vi.fn();
		const response = new Response(
			"<html><body><main>Page</main></body></html>",
			{
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			},
		);
		const updatedResponse = await maybeInjectLucidAdminBar({
			context: {
				locals: {},
				request: new Request("https://example.com/"),
			},
			response,
			options: {
				disable: false,
			},
			isDev: false,
			appFetch,
		});

		expect(updatedResponse).toBe(response);
		expect(appFetch).not.toHaveBeenCalled();
	});

	test("returns the original response when the admin bar is disabled", async () => {
		const appFetch = vi.fn();
		const response = new Response(
			"<html><body><main>Page</main></body></html>",
			{
				headers: {
					"content-type": "text/html; charset=utf-8",
				},
			},
		);
		const updatedResponse = await maybeInjectLucidAdminBar({
			context: {
				locals: {},
				request: new Request("https://example.com/"),
			},
			response,
			options: {
				disable: true,
			},
			isDev: true,
			appFetch,
		});

		expect(updatedResponse).toBe(response);
		expect(appFetch).not.toHaveBeenCalled();
	});
});
