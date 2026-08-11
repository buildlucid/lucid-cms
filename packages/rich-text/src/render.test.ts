import type { CollectionDocument } from "@lucidcms/types";
import { Node } from "@tiptap/core";
import { describe, expect, test } from "vitest";
import { generateHTML } from "./server.js";

describe("generateHTML", () => {
	test("renders hydrated internal links and drops unavailable ones", () => {
		const value = (href: string | null) => ({
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
										href,
									},
								},
							],
						},
					],
				},
			],
		});

		expect(generateHTML(value("/about"))).toBe(
			'<p><a href="/about">About</a></p>',
		);
		expect(generateHTML(value(null))).toBe("<p>About</p>");
		expect(generateHTML(value("javascript:alert(1)"))).toBe("<p>About</p>");
	});

	test("renders hydrated variables as escaped scalar text", () => {
		expect(
			generateHTML({
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "lucidVariable",
								attrs: {
									source: "document",
									collectionKey: "contacts",
									documentId: 2,
									fieldKey: "supportEmail",
									value: "support@example.com <help>",
								},
							},
						],
					},
				],
			}),
		).toBe("<p>support@example.com &lt;help&gt;</p>");
	});

	test("renders hydrated image, audio and video nodes", () => {
		expect(
			generateHTML({
				type: "doc",
				content: [
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 1,
							media: {
								type: "image",
								src: "/photo.jpg",
								alt: "Photo",
								title: "",
								mimeType: "image/jpeg",
								width: 1200,
								height: 800,
								base64: null,
								averageColor: null,
								presets: [],
							},
						},
					},
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 2,
							media: {
								type: "audio",
								src: "/audio.mp3",
								title: "",
								mimeType: "audio/mpeg",
							},
						},
					},
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 3,
							media: {
								type: "video",
								src: "/video.mp4",
								title: "",
								mimeType: "video/mp4",
								poster: {
									src: "/poster.jpg",
									alt: "",
									title: "",
									mimeType: "image/jpeg",
									width: 1200,
									height: 800,
									base64: null,
									averageColor: null,
									presets: [],
								},
							},
						},
					},
				],
			}),
		).toBe(
			'<picture data-lucid-rich-text-picture=""><source srcset="/photo.jpg 1200w"><img data-lucid-rich-text-image="" src="/photo.jpg" alt="Photo" width="1200" height="800" loading="lazy" decoding="async"></picture><audio data-lucid-rich-text-audio="" controls preload="metadata"><source src="/audio.mp3" type="audio/mpeg"></audio><video data-lucid-rich-text-video="" controls preload="metadata" poster="/poster.jpg" data-lucid-rich-text-poster-srcset="/poster.jpg 1200w"><source src="/video.mp4" type="video/mp4"></video>',
		);
	});

	test("passes embedded bricks to the configured brick renderer", () => {
		const document = {
			id: 1,
			collectionKey: "pages",
			version: "latest",
			route: null,
			fields: {},
			bricks: [
				{
					id: 10,
					ref: "callout-ref",
					key: "callout",
					order: 0,
					type: "embedded",
					fields: { heading: "Notice" },
				},
			],
		} satisfies CollectionDocument;

		expect(
			generateHTML(
				{
					type: "doc",
					content: [
						{
							type: "lucidEmbeddedBrick",
							attrs: { ref: "callout-ref" },
						},
					],
				},
				{
					document,
					renderers: {
						brick: ({ node, brick }) =>
							`<aside data-ref="${node.attrs?.ref}">${brick?.key}:${brick?.fields.heading.toUpperCase()}</aside>`,
					},
				},
			),
		).toBe('<aside data-ref="callout-ref">callout:NOTICE</aside>');
	});

	test("renders non-visual media as download links", () => {
		expect(
			generateHTML({
				type: "doc",
				content: [
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 4,
							media: {
								type: "document",
								src: "/guide.pdf",
								title: "Product guide",
								fileName: "guide.pdf",
								mimeType: "application/pdf",
							},
						},
					},
				],
			}),
		).toBe(
			'<a data-lucid-rich-text-file="document" href="/guide.pdf">Product guide</a>',
		);
	});

	test("renders responsive image presets with a removable placeholder", () => {
		expect(
			generateHTML({
				type: "doc",
				content: [
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 5,
							media: {
								type: "image",
								src: "/photo.jpg",
								alt: "Photo",
								title: "Photo",
								mimeType: "image/jpeg",
								width: 1200,
								height: 800,
								base64: "data:image/jpeg;base64,preview",
								averageColor: "#334455",
								presets: [
									{
										key: "small",
										src: "/photo.jpg?preset=small",
										mimeType: "image/webp",
										width: 300,
										height: 200,
									},
								],
							},
						},
					},
				],
			}),
		).toBe(
			'<picture data-lucid-rich-text-picture=""><source srcset="/photo.jpg?preset=small 300w, /photo.jpg 1200w"><img data-lucid-rich-text-image="" src="/photo.jpg?preset=small" alt="Photo" title="Photo" width="1200" height="800" loading="lazy" decoding="async" data-lucid-rich-text-image-placeholder="" style="background-image:url(&quot;data:image/jpeg;base64,preview&quot;);background-color:#334455;background-position:center;background-repeat:no-repeat;background-size:cover"></picture>',
		);
	});

	test("renders document nodes only when a renderer is configured", () => {
		const reference = {
			id: 7,
			collectionKey: "pages",
			route: { path: "/about", label: "About" },
			fields: {},
		};
		const document = {
			id: 1,
			collectionKey: "pages",
			version: "latest",
			route: { path: "/", label: "Home" },
			fields: {},
			refs: { relation: [reference] },
		} satisfies CollectionDocument;
		const value = {
			type: "doc",
			content: [
				{
					type: "lucidDocument",
					attrs: {
						collectionKey: "pages",
						documentId: 7,
					},
				},
			],
		};

		expect(generateHTML(value)).toBe("");
		expect(
			generateHTML(value, {
				renderers: {
					document: ({ document }) =>
						document === null ? "unresolved" : "resolved",
				},
			}),
		).toBe("unresolved");
		expect(
			generateHTML(value, {
				document,
				renderers: {
					document: ({ document: target }) => {
						if (
							!target?.route ||
							typeof target.route.path !== "string" ||
							typeof target.route.label !== "string"
						) {
							return "";
						}
						return `<a href="${target.route.path}">${target.route.label}</a>`;
					},
				},
			}),
		).toBe('<a href="/about">About</a>');
	});

	test("passes the source document when a document node points to itself", () => {
		const document = {
			id: 1,
			collectionKey: "pages",
			version: "latest",
			route: { path: "/", label: "Home" },
			fields: {},
		} satisfies CollectionDocument;
		let renderedDocument: unknown;

		expect(
			generateHTML(
				{
					type: "doc",
					content: [
						{
							type: "lucidDocument",
							attrs: {
								collectionKey: document.collectionKey,
								documentId: document.id,
							},
						},
					],
				},
				{
					document,
					renderers: {
						document: ({ document: target }) => {
							renderedDocument = target;
							return target ? `<span>${target.collectionKey}</span>` : "";
						},
					},
				},
			),
		).toBe("<span>pages</span>");
		expect(renderedDocument).toBe(document);
	});

	test("supports element renderers and the fallback renderer", () => {
		const Callout = Node.create({
			name: "callout",
			group: "block",
			content: "inline*",
			renderHTML: () => ["aside", { class: "callout" }, 0],
		});

		expect(
			generateHTML(
				{
					type: "doc",
					content: [
						{
							type: "heading",
							attrs: { level: 2 },
							content: [{ type: "text", text: "Heading" }],
						},
						{
							type: "paragraph",
							content: [{ type: "text", text: "Body" }],
						},
						{
							type: "callout",
							content: [{ type: "text", text: "Notice" }],
						},
					],
				},
				{
					extensions: [Callout],
					renderers: {
						h2: ({ children }) => `<h2 class="title">${children}</h2>`,
						fallback: ({ element, children, defaultHTML }) =>
							element === "h2"
								? "<h2>Fallback should not win</h2>"
								: element === "paragraph"
									? `<div class="paragraph">${children}</div>`
									: element === "callout"
										? `<section data-element="${element}">${children}</section>`
										: defaultHTML,
					},
				},
			),
		).toBe(
			'<h2 class="title">Heading</h2><div class="paragraph">Body</div><section data-element="callout">Notice</section>',
		);
	});

	test("keeps support for custom rendering extensions", () => {
		const Callout = Node.create({
			name: "callout",
			group: "block",
			content: "inline*",
			renderHTML: () => ["aside", { class: "callout" }, 0],
		});

		expect(
			generateHTML(
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

	test("preserves configured built-in extension markup without callbacks", () => {
		const Heading = Node.create({
			name: "heading",
			group: "block",
			content: "inline*",
			addAttributes: () => ({ level: { default: 2 } }),
			parseHTML: () => [{ tag: "h2" }],
			renderHTML: () => ["h2", { class: "prose-heading" }, 0],
		});

		expect(
			generateHTML(
				{
					type: "doc",
					content: [
						{
							type: "heading",
							attrs: { level: 2 },
							content: [{ type: "text", text: "Heading" }],
						},
					],
				},
				{ extensions: [Heading] },
			),
		).toBe('<h2 class="prose-heading">Heading</h2>');
	});
});
