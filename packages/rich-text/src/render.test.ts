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
							},
						},
					},
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 2,
							media: { type: "audio", src: "/audio.mp3" },
						},
					},
					{
						type: "lucidMedia",
						attrs: {
							mediaId: 3,
							media: {
								type: "video",
								src: "/video.mp4",
								poster: "/poster.jpg",
							},
						},
					},
				],
			}),
		).toBe(
			'<img src="/photo.jpg" alt="Photo"><audio controls src="/audio.mp3"></audio><video controls src="/video.mp4" poster="/poster.jpg"></video>',
		);
	});

	test("passes embedded bricks to the configured brick renderer", () => {
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
					bricks: [{ ref: "callout-ref", key: "callout" }],
					renderers: {
						bricks: ({ node, brick }) =>
							`<aside data-ref="${node.attrs?.ref}">${brick.key}</aside>`,
					},
				},
			),
		).toBe('<aside data-ref="callout-ref">callout</aside>');
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
});
