// @vitest-environment happy-dom

import { afterEach, describe, expect, test } from "vitest";
import { morphDocument } from "./morph.js";
import { recordServerMarkup } from "./server-markup.js";

const render = (body: string, title = "Page") =>
	new DOMParser().parseFromString(
		`<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`,
		"text/html",
	);

afterEach(() => {
	document.body.replaceChildren();
});

describe("preview page morphing", () => {
	test("updates text, attributes and the title in place, keeping marked elements", () => {
		document.body.innerHTML =
			'<main class="old"><h1>About</h1><p>Intro</p></main><div data-lucid-preview-keep>notice</div>';
		const heading = document.querySelector("h1");

		morphDocument(
			document,
			render('<main class="new"><h1>About us</h1></main>', "About us"),
		);

		expect(document.querySelector("h1")).toBe(heading);
		expect(document.title).toBe("About us");
		expect(document.body.innerHTML).toBe(
			'<main class="new"><h1>About us</h1></main><div data-lucid-preview-keep="">notice</div>',
		);
	});

	test("moves elements with IDs instead of rebuilding them", () => {
		document.body.innerHTML =
			'<section id="hero">Hero</section><section id="cta">CTA</section>';
		const hero = document.getElementById("hero");
		const cta = document.getElementById("cta");

		morphDocument(
			document,
			render(
				'<section id="cta">CTA</section><section id="hero">New hero</section>',
			),
		);

		expect(document.getElementById("hero")).toBe(hero);
		expect(document.getElementById("cta")).toBe(cta);
		expect(document.body.innerHTML).toBe(
			'<section id="cta">CTA</section><section id="hero">New hero</section>',
		);
	});

	test("replaces unrecorded custom elements whole, then only when their server markup changes", () => {
		document.body.innerHTML =
			'<demo-island props="{&quot;title&quot;:&quot;A&quot;}"><p>Server</p></demo-island>';
		//* stands in for a hydrated island rendering its own DOM
		const hydrated = document.querySelector("demo-island");
		if (hydrated) hydrated.innerHTML = "<p>Hydrated</p>";

		const island = (title: string) =>
			render(
				`<demo-island props="{&quot;title&quot;:&quot;${title}&quot;}"><p>Server</p></demo-island>`,
			);

		morphDocument(document, island("A"));
		const first = document.querySelector("demo-island");
		expect(first).not.toBe(hydrated);

		if (first) first.innerHTML = "<p>Hydrated again</p>";
		morphDocument(document, island("A"));
		expect(document.querySelector("demo-island")).toBe(first);
		expect(first?.innerHTML).toBe("<p>Hydrated again</p>");

		morphDocument(document, island("B"));
		expect(document.querySelector("demo-island")).not.toBe(first);
		expect(document.querySelector("demo-island")?.getAttribute("props")).toBe(
			'{"title":"B"}',
		);
	});

	test("leaves kept elements the server renders too, without adding copies", () => {
		document.body.innerHTML =
			'<main>Page</main><div id="chat" data-lucid-preview-keep>Live chat</div>';
		const chat = document.getElementById("chat");
		const next =
			'<main>Page</main><div id="chat" data-lucid-preview-keep></div>';

		morphDocument(document, render(next));
		morphDocument(document, render(next));

		expect(document.querySelectorAll("#chat")).toHaveLength(1);
		expect(document.getElementById("chat")).toBe(chat);
		expect(chat?.textContent).toBe("Live chat");
	});

	test("adds head assets and scripts the new page needs, removing nothing", () => {
		document.head.innerHTML =
			'<title>Page</title><style data-vite-dev-id="x">body{}</style><link rel="modulepreload" href="/site.js">';
		const next = new DOMParser().parseFromString(
			'<!doctype html><html><head><title>Page</title><link rel="modulepreload" href="/site.js"><link rel="modulepreload" href="/hero-chunk.js"><link rel="canonical" href="/about"><script type="text/x-test" src="/hero.js"></script></head><body></body></html>',
			"text/html",
		);

		morphDocument(document, next);

		expect(
			[...document.head.querySelectorAll("link")].map((link) =>
				link.getAttribute("href"),
			),
		).toEqual(["/site.js", "/hero-chunk.js"]);
		expect(
			document.head.querySelector("style[data-vite-dev-id]"),
		).not.toBeNull();
		const script = document.head.querySelector('script[src="/hero.js"]');
		expect(script?.ownerDocument).toBe(document);
		expect(script?.getAttribute("type")).toBe("text/x-test");
	});

	test("adds a new kept element beside existing ones and keeps kept elements whose wrapper changed", () => {
		document.body.innerHTML =
			'<div data-lucid-preview-keep>One</div><div data-lucid-preview-keep>Two</div><div class="old"><span id="widget" data-lucid-preview-keep>Live</span></div>';
		const widget = document.getElementById("widget");

		morphDocument(
			document,
			render(
				'<div data-lucid-preview-keep></div><div data-lucid-preview-keep></div><div data-lucid-preview-keep>Three</div><section><span id="widget" data-lucid-preview-keep></span></section>',
			),
		);

		expect(
			[...document.body.querySelectorAll("div[data-lucid-preview-keep]")].map(
				(element) => element.textContent,
			),
		).toEqual(["One", "Two", "Three"]);
		expect(document.querySelector("section #widget")).toBe(widget);
		expect(widget?.textContent).toBe("Live");
	});

	test("keeps islands recorded before they hydrated when their server markup is unchanged", () => {
		document.body.innerHTML =
			'<demo-island props="{}"><template data-slot="default"><p>Slot</p></template></demo-island>';
		recordServerMarkup(document.body);
		const island = document.querySelector("demo-island");
		//* stands in for a client-only island replacing its templates as it renders
		if (island) island.innerHTML = "<p>Rendered</p>";

		morphDocument(
			document,
			render(
				'<demo-island props="{}"><template data-slot="default"><p>Slot</p></template></demo-island>',
			),
		);

		expect(document.querySelector("demo-island")).toBe(island);
		expect(island?.innerHTML).toBe("<p>Rendered</p>");
	});
});
