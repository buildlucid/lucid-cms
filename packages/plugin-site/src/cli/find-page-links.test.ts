import { describe, expect, test } from "vitest";
import findPageLinks from "./find-page-links.js";

describe("findPageLinks", () => {
	test("finds root-relative anchor targets without queries, fragments or trailing slashes", () => {
		expect(
			findPageLinks(
				`<a href="/blog/">Blog</a><a class="x" href='/about?ref=nav#top'>About</a><a href="https://example.com/">Out</a><a href="//cdn.example.com/x">CDN</a><a href="#top">Top</a><link href="/styles.css">`,
			),
		).toEqual(["/blog", "/about"]);
	});

	test("decodes targets, to match the built paths and public file names", () => {
		expect(
			findPageLinks(
				`<a href="/caf%C3%A9">Café</a><a href="/downloads/My%20File.pdf">File</a><a href="/100%">Bad</a>`,
			),
		).toEqual(["/café", "/downloads/My File.pdf", "/100%"]);
	});
});
