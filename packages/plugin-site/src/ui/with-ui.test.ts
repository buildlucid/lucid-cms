import { createKiln, memoryLoader } from "@lucidkiln/core";
import { describe, expect, test } from "vitest";
import propTypes from "../content/prop-types.js";
import type { SiteState } from "../types.js";
import type { SiteUi } from "./site-ui.js";
import type { UiRenderer } from "./types.js";
import withUi from "./with-ui.js";

/** Renders its props as JSON and each slot marked for hydration, as real renderers do. */
const renderer = {
	render: (component, props, slots, { hydrate }) =>
		`<${component} data-hydrate="${hydrate}">${JSON.stringify(props)}${Object.entries(
			slots,
		)
			.map(
				([name, html]) => `<client-slot name="${name}">${html}</client-slot>`,
			)
			.join("")}</${component}>`,
} satisfies UiRenderer<string>;

/** Renders a paragraph and adds a title to the page's head, as Svelte's `<svelte:head>` does. */
const headRenderer = {
	render: () => ({ html: "<p>with head</p>", head: "<title>Hi</title>" }),
} satisfies UiRenderer<string>;

const ui: SiteUi = {
	script: "/_assets/element.js",
	find: (name) =>
		name === "Head.svelte"
			? {
					load: async () => ({ component: "", renderer: headRenderer }),
					assets: () => ({ src: "/_assets/Head.js", preload: [], css: [] }),
				}
			: name === "Card.tsx"
				? {
						load: async () => ({ component: "x-card", renderer }),
						assets: () => ({
							src: "/_assets/Card.js",
							preload: ["/_assets/shared.js"],
							css: ["/_assets/Card.css"],
						}),
					}
				: null,
};

const render = (source: string, context: Record<string, unknown> = {}) =>
	createKiln<SiteState>({
		loader: withUi(memoryLoader({ "page.kiln": source }), ui),
		types: propTypes,
	}).render("page.kiln", context, { state: {} as SiteState });

describe("UI components", () => {
	test("render on the server only without client, without slot marks", async () => {
		await expect(
			render(
				'{% component "Card.tsx" with { a: 1 } %}<p>Hi</p>{% endcomponent %}',
			),
		).resolves.toBe(
			'<link rel="stylesheet" href="/_assets/Card.css" data-client-component><x-card data-hydrate="false">{"a":1}<p>Hi</p></x-card>',
		);
	});

	test("hydrate in a client-component element with their props as JSON", async () => {
		const html = await render(
			'{% include "Card.tsx" with { a: "<b>", client: { media: "(width > 40em)" } } %}',
		);
		expect(html).toMatch(
			/^<link rel="stylesheet" href="\/_assets\/Card.css" data-client-component><client-component client="media" media="\(width &gt; 40em\)" src="\/_assets\/Card.js" props="\{&quot;a&quot;:&quot;&lt;b&gt;&quot;\}" prefix="[0-9a-f]{8}" style="display:contents"><x-card data-hydrate="true">/,
		);
		expect(html).toContain(
			'</client-component><script type="module" src="/_assets/element.js" data-client-component></script>',
		);
	});

	test("preload their modules only when they hydrate on load", async () => {
		expect(
			await render('{% include "Card.tsx" with { client: "load" } %}'),
		).toContain(
			'<link rel="modulepreload" href="/_assets/Card.js" data-client-component><link rel="modulepreload" href="/_assets/shared.js" data-client-component><client-component client="load"',
		);
		expect(
			await render('{% include "Card.tsx" with { client: "visible" } %}'),
		).not.toContain("modulepreload");
	});

	test("render only in the browser with client only, showing the fallback", async () => {
		const html = await render(
			'{% component "Card.tsx" with { client: "only" } %}<p>Hi</p>{% fill "fallback" %}Loading{% endfill %}{% endcomponent %}',
		);
		expect(html).toContain(
			'<client-component client="only" src="/_assets/Card.js" props="{}"',
		);
		expect(html).toContain(
			'style="display:contents">Loading<template data-slot="default"><p>Hi</p></template></client-component>',
		);
		expect(html).not.toContain("x-card");
	});

	test("fail for props JSON can't hold, naming the prop", async () => {
		await expect(
			render('{% include "Card.tsx" with { post: post, client: "load" } %}', {
				post: { date: new Date(0) },
			}),
		).rejects.toThrow(
			/Prop "post.date" of "Card.tsx" can't be sent to the browser, because a Date isn't JSON/,
		);
	});

	test("fail for an unknown client value", async () => {
		await expect(
			render('{% include "Card.tsx" with { client: "soon" } %}'),
		).rejects.toThrow(/The client prop of "Card.tsx" must be/);
	});

	test("leave other names to the template loader", async () => {
		await expect(render("plain")).resolves.toBe("plain");
	});

	test("add their head content to the head outlet, once for the same content", async () => {
		await expect(
			render(
				'<head>{% outlet "head" %}</head>{% include "Head.svelte" %}{% include "Head.svelte" %}',
			),
		).resolves.toBe(
			"<head><title>Hi</title></head><p>with head</p><p>with head</p>",
		);
	});

	test("still render when a flush sent the head already", async () => {
		await expect(
			render(
				'<head>{% outlet "head" %}</head>{% flush %}{% include "Head.svelte" %}',
			),
		).resolves.toBe("<head></head><p>with head</p>");
	});
});
