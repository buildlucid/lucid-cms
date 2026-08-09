import { Node } from "@tiptap/core";
import { describe, expect, test } from "vitest";
import { renderRichTextHTML } from "./render.js";

const documentLink = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					text: "About",
					marks: [
						{
							type: "link",
							attrs: {
								kind: "document",
								collectionKey: "pages",
								documentId: 7,
							},
						},
					],
				},
			],
		},
	],
};

describe("renderRichTextHTML references", () => {
	test("renders a missing document reference as plain text", () => {
		expect(renderRichTextHTML(documentLink)).toBe("<p>About</p>");
	});

	test("renders an unsafe document route as plain text", () => {
		expect(
			renderRichTextHTML(documentLink, {
				refs: {
					relation: [
						{
							id: 7,
							collectionKey: "pages",
							route: { path: "javascript:alert(1)", label: "About" },
							fields: null,
						},
					],
				},
			}),
		).toBe("<p>About</p>");
	});

	test("resolves document links from the route on relation refs", () => {
		expect(
			renderRichTextHTML(documentLink, {
				refs: {
					relation: [
						{
							id: 7,
							collectionKey: "pages",
							route: { path: "/pages/about", label: "About" },
							fields: { slug: "about" },
						},
					],
				},
			}),
		).toBe('<p><a href="/pages/about">About</a></p>');
	});

	test("passes the resolved current path to a custom document-link renderer", () => {
		expect(
			renderRichTextHTML(documentLink, {
				refs: {
					relation: [
						{
							id: 7,
							collectionKey: "pages",
							route: { path: "/about", label: "About" },
							fields: { slug: { value: "about" } },
						},
					],
				},
				renderers: {
					documentLink: ({ children, href }) =>
						`<site-link to="${href}">${children}</site-link>`,
				},
			}),
		).toBe('<p><site-link to="/about">About</site-link></p>');
	});

	test("gets image metadata from the media ref rather than the node", () => {
		const value = {
			type: "doc",
			content: [
				{
					type: "lucidMedia",
					attrs: { mediaId: 12 },
				},
			],
		};

		expect(
			renderRichTextHTML(value, {
				refs: {
					media: [
						{
							id: 12,
							type: "image",
							title: { en: "Photo" },
							alt: { en: "Current alt text" },
							file: { url: "/media/photo.jpg" },
						},
					],
				},
				locale: "en",
			}),
		).toBe('<img src="/media/photo.jpg" alt="Current alt text">');
	});

	test("resolves an inline variable from a flattened content document ref", () => {
		const value = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "lucidVariable",
							attrs: {
								collectionKey: "contacts",
								documentId: 2,
								fieldKey: "supportEmail",
							},
						},
					],
				},
			],
		};

		expect(
			renderRichTextHTML(value, {
				refs: {
					relation: [
						{
							id: 2,
							collectionKey: "contacts",
							route: null,
							fields: { supportEmail: "support@example.com" },
						},
					],
				},
			}),
		).toBe("<p>support@example.com</p>");
	});

	test("resolves localized flattened and internal document fields", () => {
		const options = { locale: "fr" } as const;

		expect(
			renderRichTextHTML(documentLink, {
				...options,
				refs: {
					relation: [
						{
							id: 7,
							collectionKey: "pages",
							route: {
								path: { en: "/about", fr: "/a-propos" },
								label: { en: "About", fr: "À propos" },
							},
							fields: { slug: { en: "about", fr: "a-propos" } },
						},
					],
				},
			}),
		).toBe('<p><a href="/a-propos">About</a></p>');

		expect(
			renderRichTextHTML(documentLink, {
				...options,
				refs: {
					relation: [
						{
							id: 7,
							collectionKey: "pages",
							route: {
								path: { en: "/about", fr: "/a-propos" },
								label: { en: "About", fr: "À propos" },
							},
							fields: {
								slug: {
									translations: { en: "about", fr: "a-propos" },
								},
							},
						},
					],
				},
			}),
		).toBe('<p><a href="/a-propos">About</a></p>');
	});

	test("passes the hydrated embedded brick to a custom renderer", () => {
		const value = {
			type: "doc",
			content: [
				{
					type: "lucidEmbeddedBrick",
					attrs: { ref: "callout-ref" },
				},
			],
		};

		expect(
			renderRichTextHTML(value, {
				bricks: [
					{
						ref: "callout-ref",
						key: "callout",
						fields: { heading: { value: "Important" } },
					},
				],
				renderers: {
					embeddedBrick: ({ ref, brick }) =>
						`<aside data-ref="${ref}">${brick.key}</aside>`,
				},
			}),
		).toBe('<aside data-ref="callout-ref">callout</aside>');
	});

	test("drops unsafe external link destinations", () => {
		expect(
			renderRichTextHTML({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Unsafe",
								marks: [
									{
										type: "link",
										attrs: { href: "javascript:alert(1)" },
									},
								],
							},
						],
					},
				],
			}),
		).toBe("<p>Unsafe</p>");
	});

	test("keeps support for custom rendering extensions", () => {
		const Callout = Node.create({
			name: "callout",
			group: "block",
			content: "inline*",
			renderHTML: () => ["aside", { class: "callout" }, 0],
		});

		expect(
			renderRichTextHTML(
				{
					type: "doc",
					content: [
						{
							type: "callout",
							content: [{ type: "text", text: "Notice" }],
						},
					],
				},
				{ extensions: [Callout] },
			),
		).toBe('<aside class="callout">Notice</aside>');
	});
});
