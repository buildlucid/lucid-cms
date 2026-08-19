import type { RichTextJSON } from "@lucidcms/rich-text";
import { describe, expect, test } from "vitest";
import type { CustomFieldResponseFormatContext } from "../../../types.js";
import hydrateRichTextValue from "./hydrate-value.js";
import normalizeRichTextValue from "./normalize-value.js";

const value: RichTextJSON = {
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
				{
					type: "lucidVariable",
					attrs: {
						source: "document",
						collectionKey: "settings",
						documentId: 2,
						fieldKey: "supportEmail",
					},
				},
				{
					type: "lucidVariable",
					attrs: {
						source: "user",
						userId: 9,
						fieldKey: "firstName",
					},
				},
			],
		},
		{ type: "lucidMedia", attrs: { mediaId: 12 } },
		{
			type: "lucidDocument",
			attrs: { collectionKey: "pages", documentId: 7 },
		},
	],
};

const context = {
	locale: "fr",
	refs: {
		relation: [
			{
				id: 7,
				collectionKey: "pages",
				route: {
					path: { en: "/about", fr: "/a-propos" },
					label: { en: "About", fr: "À propos" },
				},
				fields: null,
			},
			{
				id: 2,
				collectionKey: "settings",
				route: null,
				fields: {
					supportEmail: {
						key: "supportEmail",
						type: "text",
						translations: {
							en: "support@example.com",
							fr: "aide@example.com",
						},
					},
				},
			},
		],
		media: [
			{
				id: 12,
				type: "image",
				title: { en: "Photo", fr: "Photographie" },
				alt: { en: "A photo", fr: "Une photographie" },
				key: "photo.jpg",
				url: "/photo.jpg",
				fileName: "photo.jpg",
				meta: {
					mimeType: "image/jpeg",
					width: 1200,
					height: 800,
					base64: "data:image/jpeg;base64,preview",
					averageColor: "#334455",
				},
			},
		],
		user: [
			{
				id: 9,
				username: "william",
				email: "william@example.com",
				firstName: "William",
				lastName: "Yallop",
				profilePicture: null,
			},
		],
	},
} satisfies CustomFieldResponseFormatContext;

describe("rich-text response hydration", () => {
	test("hydrates values without replacing node reference identities", () => {
		const hydrated = hydrateRichTextValue(value, context);
		const link = hydrated.content?.[0]?.content?.[0]?.marks?.[0];
		const variable = hydrated.content?.[0]?.content?.[1];
		const userVariable = hydrated.content?.[0]?.content?.[2];
		const media = hydrated.content?.[1];
		const document = hydrated.content?.[2];

		expect(link).toMatchObject({
			type: "link",
			attrs: {
				kind: "document",
				collectionKey: "pages",
				documentId: 7,
				href: "/a-propos",
			},
		});
		expect(variable).toMatchObject({
			type: "lucidVariable",
			attrs: {
				source: "document",
				collectionKey: "settings",
				documentId: 2,
				fieldKey: "supportEmail",
				value: "aide@example.com",
			},
		});
		expect(userVariable).toMatchObject({
			type: "lucidVariable",
			attrs: {
				source: "user",
				userId: 9,
				fieldKey: "firstName",
				value: "William",
			},
		});
		expect(media).toMatchObject({
			type: "lucidMedia",
			attrs: {
				mediaId: 12,
				media: {
					type: "image",
					src: "/photo.jpg",
					alt: "Une photographie",
					base64: "data:image/jpeg;base64,preview",
				},
			},
		});
		expect(media?.attrs?.media).not.toHaveProperty("presets");
		expect(document).toMatchObject({
			type: "lucidDocument",
			attrs: {
				collectionKey: "pages",
				documentId: 7,
			},
		});
	});

	test("sets missing references to null", () => {
		const hydrated = hydrateRichTextValue(value, {
			locale: "en",
			refs: null,
		});

		expect(
			hydrated.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.href,
		).toBeNull();
		expect(hydrated.content?.[0]?.content?.[1]?.attrs?.value).toBeNull();
		expect(hydrated.content?.[0]?.content?.[2]?.attrs?.value).toBeNull();
		expect(hydrated.content?.[1]?.attrs?.media).toBeNull();
		expect(hydrated.content?.[2]?.attrs).toEqual({
			collectionKey: "pages",
			documentId: 7,
		});
	});

	test("removes only derived values before persistence", () => {
		expect(
			normalizeRichTextValue(hydrateRichTextValue(value, context)),
		).toEqual(value);
	});

	test("removes legacy document payloads before persistence", () => {
		expect(
			normalizeRichTextValue({
				type: "lucidDocument",
				attrs: {
					collectionKey: "pages",
					documentId: 7,
					document: { id: 7, collectionKey: "pages" },
				},
			}),
		).toEqual({
			type: "lucidDocument",
			attrs: { collectionKey: "pages", documentId: 7 },
		});
	});
});
