import { logger } from "@lucidcms/core";
import {
	hostComponent,
	KilnRenderError,
	type RenderInfo,
	safe,
} from "@lucidkiln/core";
import { HEAD_OUTLET, PLUGIN_KEY } from "../constants.js";
import type { SiteState } from "../types.js";
import escapeHtml from "../utils/escape-html.js";
import { propsJson, readClient } from "./client-props.js";
import { slotPlaceholders } from "./client-slot.js";
import { assetLink, assetScript } from "./page-assets.js";
import type { SiteUiComponent } from "./site-ui.js";
import type { UiClient } from "./types.js";

/**
 * Adds what a component puts in the page's head, such as Svelte's `<svelte:head>`, to the `head` outlet, once for the
 * same content. A `flush` may have sent the head already: the page still renders, with a warning.
 */
const addToHead = (name: string, html: string, info: RenderInfo<SiteState>) => {
	try {
		info.addTo(HEAD_OUTLET, html, { once: html });
	} catch (error) {
		if (!(error instanceof KilnRenderError && error.code === "outlet-closed")) {
			throw error;
		}
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.ui.head-sent",
			dedupeKey: `${PLUGIN_KEY}:head-sent:${name}`,
			message: `"${name}" adds to the page's head after a {% flush %} sent it, so its head content is left out. Move the flush below the component, or set the head in the template.`,
		});
	}
};

/** A component's slots as templates, which a component that renders only in the browser builds them from. */
const templateSlots = (slots: Record<string, string>) =>
	Object.entries(slots)
		.map(
			([name, html]) =>
				`<template data-slot="${escapeHtml(name)}">${html}</template>`,
		)
		.join("");

/** The attributes that tell `<client-component>` when to load. */
const clientAttributes = (client: UiClient) =>
	typeof client === "string"
		? `client="${client}"`
		: `client="media" media="${escapeHtml(client.media)}"`;

/**
 * A host component that renders a UI library's component. With a `client` prop it is wrapped in `<client-component>`,
 * which hydrates it in the browser; with `client: "only"` the template's `fallback` fill shows until it renders there.
 *
 * Each instance writes its stylesheets and the element's script, however often a page uses it, so a cached section
 * keeps everything it needs. Browsers fetch each file once, and pages rendered in one go move them into the head.
 * Components that load straight away preload their modules.
 */
const createUiComponent = (name: string, ui: SiteUiComponent, script: string) =>
	hostComponent<SiteState>(
		async ({ client: clientProp, ...props }, markup, info) => {
			const client = readClient(name, clientProp);
			const hydrate = client !== null;
			const slots = Object.fromEntries(
				Object.entries(markup).map(([slot, html]) => [slot, html.value]),
			);
			const id = crypto.randomUUID().slice(0, 8);

			let html: string;
			if (client === "only") {
				const { fallback = "", ...rest } = slots;
				html = fallback + templateSlots(rest);
			} else {
				const { component, renderer } = await ui.load();
				const { placeholders, fill } = slotPlaceholders(id, slots);
				const rendered = await renderer.render(component, props, placeholders, {
					id,
					hydrate,
				});

				const result =
					typeof rendered === "string" ? { html: rendered } : rendered;
				html = fill(result.html, hydrate);
				if (result.head) addToHead(name, result.head, info);
			}

			const assets = ui.assets();
			const links = assets.css
				.map((href) => assetLink("stylesheet", href))
				.join("");
			if (client === null) return safe(links + html);

			const preloads =
				client === "load" || client === "only"
					? [assets.src, ...assets.preload]
							.map((href) => assetLink("modulepreload", href))
							.join("")
					: "";

			return safe(
				`${links}${preloads}<client-component ${clientAttributes(client)} src="${escapeHtml(assets.src)}" props="${escapeHtml(propsJson(name, props))}" prefix="${id}" style="display:contents">${html}</client-component>${assetScript(script)}`,
			);
		},
	);

export default createUiComponent;
