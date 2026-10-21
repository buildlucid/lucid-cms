import { type Component, createResource, type JSX } from "solid-js";
import { escape as solidEscape, ssr, ssrHydrationKey } from "solid-js/web";
import { describe, expect, test } from "vitest";
import renderer from "./server.js";

/** A component with a resource, which the server waits for and serialises for the browser to pick up. */
const Greeting: Component = () => {
	const [name] = createResource(async () => "Ada");
	// What the Solid compiler outputs for `<p>Hello {name()}</p>`, whose type JSX.Element doesn't describe.
	const html = ssr(
		["<p", ">Hello ", "</p>"],
		ssrHydrationKey(),
		solidEscape(name() ?? ""),
	);
	return html as unknown as JSX.Element;
};

const render = async (hydrate: boolean) => {
	const rendered = await renderer.render(
		Greeting,
		{},
		{},
		{ id: "test", hydrate },
	);
	return typeof rendered === "string" ? rendered : rendered.html;
};

describe("Solid renderer", () => {
	test("waits for resources and sets up hydration state before their serialised data", async () => {
		const html = await render(true);

		expect(html).toContain("Hello Ada");
		expect(html.startsWith("<script>window._$HY||")).toBe(true);
		expect(html.indexOf('_$HY.r["')).toBeGreaterThan(html.indexOf("<p"));
	});

	test("waits for resources in server-only components without adding scripts", async () => {
		const html = await render(false);

		expect(html).toBe("<p>Hello Ada</p>");
	});
});
