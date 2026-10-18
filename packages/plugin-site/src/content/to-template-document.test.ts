import type { FieldTypes, Refs } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import richText from "../functions/rich-text.js";
import { fieldTargets } from "../preview/field-targets.js";
import propTypes from "./prop-types.js";
import toTemplateDocument from "./to-template-document.js";
import type { TemplateRichTextNode } from "./to-template-rich-text.js";

const locales = new Set(["en", "fr"]);
const convert = (
	locale: string,
	props: {
		refs?: Refs;
		fieldTypes?: Record<string, Record<string, FieldTypes>>;
	} = {},
) =>
	toTemplateDocument({
		document,
		refs: props.refs ?? {},
		locale,
		config: {
			locales,
			fieldTypes: (collectionKey, brickKey) =>
				new Map(
					Object.entries(props.fieldTypes?.[brickKey ?? collectionKey] ?? {}),
				),
		},
	});

const document = {
	id: 7,
	collectionKey: "page",
	version: null,
	route: {
		path: { en: "/en/about", fr: "/fr/a-propos" },
		label: { en: "About", fr: "À propos" },
	},
	fields: {
		title: { en: "About", fr: "À propos" },
		summary: { en: "English only" },
		views: 12,
		links: [
			{ label: { en: "Home", fr: "Accueil" }, url: "/" },
			{ label: { en: "Blog", fr: "Blog" }, url: "/blog" },
		],
		related: [
			{ id: 3, collectionKey: "page" },
			{ id: 4, collectionKey: "blog" },
		],
		hero: [5],
		author: [9],
		details: { caption: { en: "Caption", fr: "Légende" }, photo: [5] },
		body: {
			fr: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Bonjour " }],
					},
					{ type: "lucidEmbeddedBrick", attrs: { ref: "e1" } },
					{
						type: "lucidDocument",
						attrs: { collectionKey: "page", documentId: 3 },
					},
				],
			},
		},
	},
	bricks: [
		{
			ref: "b1",
			id: 1,
			key: "banner",
			order: 0,
			type: "builder" as const,
			fields: { heading: { en: "Hello", fr: "Bonjour" } },
		},
		{
			ref: "b2",
			id: 2,
			key: "seo",
			order: 0,
			type: "fixed" as const,
			fields: { title: "SEO title" },
		},
		{
			ref: "e1",
			id: 3,
			key: "callout",
			order: 0,
			type: "embedded" as const,
			fields: { heading: { en: "Note", fr: "Remarque" }, image: [5] },
		},
	],
	meta: {
		versionId: 41,
		versions: {},
		createdAt: null,
		updatedAt: "2026-10-17T10:00:00.000Z",
		createdBy: null,
		updatedBy: null,
		createdByRunId: null,
		updatedByRunId: null,
	},
};

const refs = {
	media: [
		{
			id: 5,
			type: "image",
			key: "public/5",
			url: "/cdn/public/5",
			title: { en: "Cat", fr: "Chat" },
			alt: { en: "A cat" },
		},
	],
	users: [
		{
			id: 9,
			username: "ada",
			firstName: "Ada",
			lastName: "Lovelace",
			profilePicture: null,
		},
	],
	documents: [
		{
			id: 3,
			collectionKey: "page",
			route: {
				path: { en: "/en/contact", fr: "/fr/contact" },
				label: "Contact",
			},
			fields: { title: { en: "Contact", fr: "Nous contacter" }, hero: [5] },
		},
		{
			id: 4,
			collectionKey: "blog",
			route: { path: "/blog/hello", label: "Hello" },
			fields: { title: "Hello" },
		},
	],
} as unknown as Refs;

const fieldTypes = {
	page: {
		hero: "media",
		author: "user",
		related: "relation",
		body: "rich-text",
		details: "section",
		photo: "media",
	},
	callout: { image: "media" },
} satisfies Record<string, Record<string, FieldTypes>>;

describe("toTemplateDocument", () => {
	test("resolves fields, repeater groups and the url for the locale", () => {
		const page = convert("fr");

		expect(page).toMatchObject({
			id: 7,
			locale: "fr",
			url: "/fr/a-propos",
			updatedAt: "2026-10-17T10:00:00.000Z",
			versionId: 41,
			fields: {
				title: "À propos",
				views: 12,
				links: [
					{ label: "Accueil", url: "/" },
					{ label: "Blog", url: "/blog" },
				],
				related: [
					{ id: 3, collectionKey: "page" },
					{ id: 4, collectionKey: "blog" },
				],
			},
		});
	});

	test("gives null for a translation the locale doesn't have", () => {
		expect(convert("fr").fields.summary).toBe(null);
	});

	test("fills in media and related documents, leaving a related document's own references as stored", () => {
		const page = convert("fr", { refs, fieldTypes });

		expect(page.urls).toEqual({ en: "/en/about", fr: "/fr/a-propos" });
		expect(page.fields.hero).toMatchObject([
			{ id: 5, url: "/cdn/public/5", title: "Chat", alt: null },
		]);
		expect(page.fields.related).toEqual([
			{
				id: 3,
				collectionKey: "page",
				locale: "fr",
				url: "/fr/contact",
				urls: { en: "/en/contact", fr: "/fr/contact" },
				fields: { title: "Nous contacter", hero: [5] },
			},
			{
				id: 4,
				collectionKey: "blog",
				locale: "fr",
				url: "/blog/hello",
				urls: { fr: "/blog/hello" },
				fields: { title: "Hello" },
			},
		]);
	});

	test("fills in users as the content API returns them", () => {
		expect(convert("fr", { refs, fieldTypes }).fields.author).toEqual([
			{
				id: 9,
				username: "ada",
				firstName: "Ada",
				lastName: "Lovelace",
				profilePicture: null,
			},
		]);
	});

	test("resolves fields inside sections at the paths they're stored at", () => {
		const page = convert("fr", { refs, fieldTypes });

		expect(page.fields.details).toMatchObject({
			caption: "Légende",
			photo: [{ id: 5, title: "Chat" }],
		});
		expect(fieldTargets.get(page.fields.details as object)?.path).toEqual([]);
	});

	test("turns rich text into nodes with their embedded bricks and documents", () => {
		const page = convert("fr", { refs, fieldTypes });
		const body = page.fields.body as TemplateRichTextNode;

		expect(body.content.map((node) => node.type)).toEqual([
			"paragraph",
			"lucidEmbeddedBrick",
			"lucidDocument",
		]);
		expect(body.content[1]?.brick).toMatchObject({
			key: "callout",
			fields: { heading: "Remarque", image: [{ id: 5, title: "Chat" }] },
		});
		expect(body.content[2]?.document).toBe(
			(page.fields.related as unknown[])[0],
		);
		expect(String(richText(body))).toBe("<p>Bonjour </p>");
		// Embedded bricks are still bricks, but previews can't point at them.
		expect(propTypes.Brick(body.content[1]?.brick)).toBe(true);
		expect(fieldTargets.has(body.content[1]?.brick as object)).toBe(false);
	});

	test("lists builder bricks and keys fixed bricks by their key", () => {
		const page = convert("fr");

		expect(page.bricks).toEqual([
			{ id: 1, key: "banner", fields: { heading: "Bonjour" } },
		]);
		expect(page.fixed).toEqual({
			seo: { id: 2, key: "seo", fields: { title: "SEO title" } },
		});
	});
});
