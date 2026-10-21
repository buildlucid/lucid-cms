import { describe, expect, test } from "vitest";
import { assetScript, assetLink as link, moveUiAssets } from "./page-assets.js";

describe("moveUiAssets", () => {
	test("moves components' links into the head once each, inlining small stylesheets", () => {
		const html = `<html><head><title>x</title></head><body>${link("stylesheet", "/a.css")}${link("modulepreload", "/a.js")}<p>a</p>${link("stylesheet", "/a.css")}${link("stylesheet", "/b.css")}</body></html>`;
		expect(moveUiAssets(html, { "/b.css": ".b{}" })).toBe(
			'<html><head><title>x</title><link rel="stylesheet" href="/a.css"><link rel="modulepreload" href="/a.js"><style>.b{}</style></head><body><p>a</p></body></html>',
		);
	});

	test("moves the element's script, once", () => {
		const script = assetScript("/el.js");
		expect(
			moveUiAssets(`<head></head><body>${script}${script}</body>`, {}),
		).toBe(
			'<head><script type="module" src="/el.js"></script></head><body></body>',
		);
	});

	test("leaves pages without a head and other links alone", () => {
		const fragment = `<p>a</p>${link("stylesheet", "/a.css")}`;
		expect(moveUiAssets(fragment, {})).toBe(fragment);
		const page =
			'<head></head><body><link rel="stylesheet" href="/own.css"></body>';
		expect(moveUiAssets(page, {})).toBe(page);
	});
});
