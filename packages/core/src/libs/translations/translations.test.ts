import { describe, expect, test } from "vitest";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import { fieldHooks } from "../collection/custom-fields/registered-fields.js";
import defineBrick from "../collection/define-brick.js";
import defineCollection from "../collection/define-collection.js";
import field from "../collection/definitions/fields/field.js";
import resolveCollectionLocalization from "../collection/helpers/resolve-collection-localization.js";
import { copy } from "../i18n/index.js";
import applyTranslationChanges from "./apply-translation-changes.js";
import checkTranslatedText from "./check-translated-text.js";
import getChangedLocales from "./get-changed-locales.js";
import getTranslationStatus from "./get-translation-status.js";
import hashTranslationText from "./hash-translation-text.js";
import type { ContentInput } from "./list-content-fields.js";
import listTranslationStates from "./list-translation-states.js";
import mergeLocaleContent from "./merge-locale-content.js";
import stampTranslationSources from "./stamp-translation-sources.js";

const label = copy("admin:tests.collections.page.name", {
	defaultMessage: "Pages",
});
const collection = defineCollection({
	key: "page",
	mode: "multiple",
	localized: true,
	details: { labels: { singular: label, plural: label } },
	bricks: {
		builder: [
			defineBrick({
				key: "hero",
				fields: [
					field.text("heading"),
					field.repeater("items", { fields: [field.text("itemTitle")] }),
				],
			}),
		],
		embedded: [
			defineBrick({ key: "quote", fields: [field.text("quoteText")] }),
		],
	},
	fields: [
		field.text("title"),
		field.richText("body"),
		field.link("cta", { localized: true }),
		field.text("button", { default: "Learn more" }),
		field.text("slug", { localized: false }),
		field.text("phone", { translate: false }),
	],
});

const localization = resolveCollectionLocalization({
	localization: {
		locales: [
			{ label: "English", code: "en" },
			{ label: "French", code: "fr" },
			{ label: "German", code: "de" },
		],
		defaultLocale: "en",
	},
	collection,
});

const hash = (text: string) => hashTranslationText({ format: "text", text });

const content = (
	title: Record<string, string>,
	extra?: Partial<FieldInputSchema>,
) =>
	({
		fields: [{ key: "title", type: "text", translations: title, ...extra }],
		bricks: [],
	}) satisfies ContentInput;

const titleField = (value: ContentInput) => value.fields?.[0];

describe("stampTranslationSources", () => {
	test("records a changed translation as a person's, made from the current source", () => {
		const next = content({ en: "Hello", fr: "Bonjour !" });
		stampTranslationSources({
			collection,
			localization,
			previous: content({ en: "Hello", fr: "Bonjour" }),
			next,
		});

		expect(titleField(next)?.translationSources).toEqual({
			fr: { source: hash("Hello"), origin: "person" },
		});
	});

	test("keeps the stored source of an unchanged translation", () => {
		const stored = {
			source: hash("Hi"),
			origin: "ai",
			output: hash("Salut"),
		} as const;
		const next = content({ en: "Hello", fr: "Salut" });
		stampTranslationSources({
			collection,
			localization,
			previous: content(
				{ en: "Hi", fr: "Salut" },
				{ translationSources: { fr: stored } },
			),
			next,
		});

		expect(titleField(next)?.translationSources).toEqual({ fr: stored });
	});

	test("keeps a machine source only while its output matches the value", () => {
		const machine = {
			source: hash("Hello"),
			origin: "ai",
			output: hash("Bonjour"),
		} as const;
		const unchanged = content(
			{ en: "Hello", fr: "Bonjour" },
			{ translationSources: { fr: machine } },
		);
		const edited = content(
			{ en: "Hello", fr: "Bonjour à tous" },
			{ translationSources: { fr: machine } },
		);
		for (const next of [unchanged, edited]) {
			stampTranslationSources({
				collection,
				localization,
				previous: null,
				next,
			});
		}

		expect(titleField(unchanged)?.translationSources?.fr).toEqual(machine);
		expect(titleField(edited)?.translationSources?.fr).toEqual({
			source: hash("Hello"),
			origin: "person",
		});
	});

	test("accepts a person's source only when it matches the current source", () => {
		const previous = content(
			{ en: "Hello", fr: "Bonjour" },
			{ translationSources: { fr: { source: hash("Hi"), origin: "person" } } },
		);
		const checked = content(
			{ en: "Hello", fr: "Bonjour" },
			{
				translationSources: { fr: { source: hash("Hello"), origin: "person" } },
			},
		);
		const stale = content(
			{ en: "Hello", fr: "Bonjour" },
			{ translationSources: { fr: { source: hash("Old"), origin: "person" } } },
		);
		for (const next of [checked, stale]) {
			stampTranslationSources({ collection, localization, previous, next });
		}

		expect(titleField(checked)?.translationSources?.fr?.source).toBe(
			hash("Hello"),
		);
		expect(titleField(stale)?.translationSources?.fr?.source).toBe(hash("Hi"));
	});

	test("leaves out sources on unlocalized and opted-out fields", () => {
		const next: ContentInput = {
			fields: [
				{
					key: "slug",
					type: "text",
					value: "hello",
					translationSources: { fr: { source: "x", origin: "person" } },
				},
				{
					key: "phone",
					type: "text",
					translations: { en: "123", fr: "456" },
					translationSources: { fr: { source: "x", origin: "person" } },
				},
			],
		};
		stampTranslationSources({ collection, localization, previous: null, next });

		expect(next.fields?.map((field) => field.translationSources)).toEqual([
			undefined,
			undefined,
		]);
	});
});

describe("mergeLocaleContent", () => {
	test("copies only the given locales, keeping everything else from the target", () => {
		const target: ContentInput = {
			fields: [
				{
					key: "title",
					type: "text",
					translations: { en: "New", fr: "Vieux", de: "Alt" },
				},
				{ key: "slug", type: "text", value: "new" },
			],
			bricks: [
				{ ref: "added", key: "hero", order: 0, type: "builder", fields: [] },
			],
		};
		const source: ContentInput = {
			fields: [
				{
					key: "title",
					type: "text",
					translations: { en: "Old", fr: "Nouveau", de: "Neu" },
					translationSources: { fr: { source: hash("Old"), origin: "person" } },
				},
				{ key: "slug", type: "text", value: "old" },
			],
			bricks: [],
		};

		const merged = mergeLocaleContent({
			collection,
			localization,
			target,
			source,
			locales: ["fr"],
		});

		expect(merged.fields).toEqual([
			{
				key: "title",
				type: "text",
				translations: { en: "New", fr: "Nouveau", de: "Alt" },
				translationSources: { fr: { source: hash("Old"), origin: "person" } },
			},
			{ key: "slug", type: "text", value: "new" },
		]);
		expect(merged.bricks).toEqual(target.bricks);
	});
});

describe("getChangedLocales", () => {
	const brick = (heading: Record<string, string>, items: string[]) => ({
		ref: "hero-1",
		key: "hero",
		order: 0,
		type: "builder" as const,
		fields: [
			{ key: "heading", type: "text" as const, translations: heading },
			{
				key: "items",
				type: "repeater" as const,
				groups: items.map((ref, order) => ({ ref, order, fields: [] })),
			},
		],
	});

	test("reports translated changes by locale and shared changes as null", () => {
		const previous = {
			fields: [{ key: "slug", type: "text" as const, value: "a" }],
			bricks: [brick({ en: "Hi", fr: "Salut" }, ["a", "b"])],
		};

		expect([
			...getChangedLocales({
				collection,
				localization,
				previous,
				next: {
					fields: previous.fields,
					bricks: [brick({ en: "Hi", fr: "Bonjour" }, ["a", "b"])],
				},
			}),
		]).toEqual(["fr"]);
		expect([
			...getChangedLocales({
				collection,
				localization,
				previous,
				next: {
					fields: [{ key: "slug", type: "text", value: "b" }],
					bricks: [brick({ en: "Hi", fr: "Salut" }, ["b", "a"])],
				},
			}),
		]).toEqual([null]);
	});
});

describe("checkTranslatedText", () => {
	const source = {
		format: "html",
		text: '<p>Read <a href="/a" target="_blank">this</a> and <strong>that</strong></p>',
	} as const;

	test("accepts the same tags in another order", () => {
		expect(
			checkTranslatedText(
				source,
				'<p><strong>Ceci</strong> et lisez <a target="_blank" href="/a">cela</a></p>',
			),
		).toBeNull();
	});

	test("rejects changed links, lost tags and empty text", () => {
		expect(
			checkTranslatedText(
				source,
				'<p>Lisez <a href="/b" target="_blank">ceci</a> et cela</p>',
			),
		).toBe("markup");
		expect(checkTranslatedText(source, "<p>Lisez ceci</p>")).toBe("markup");
		expect(checkTranslatedText({ format: "text", text: "Hi" }, "  ")).toBe(
			"empty",
		);
	});
});

describe("getTranslationStatus", () => {
	test("counts missing, out-of-date and people's translations per locale", () => {
		const status = getTranslationStatus({
			collection,
			localization,
			content: content(
				{ en: "Hello world", fr: "Salut" },
				{
					translationSources: {
						fr: { source: hash("Hi"), origin: "ai", output: hash("Salut") },
					},
				},
			),
		});

		expect(status).toEqual([
			{
				locale: "fr",
				fields: 1,
				missing: 0,
				outdated: 1,
				byPerson: 0,
				byPersonOutdated: 0,
				words: { update: 2, overwrite: 2 },
			},
			{
				locale: "de",
				fields: 1,
				missing: 1,
				outdated: 0,
				byPerson: 0,
				byPersonOutdated: 0,
				words: { update: 2, overwrite: 2 },
			},
		]);
	});
});

describe("listTranslationStates", () => {
	test("gives each field's state per locale: machine, person or missing", () => {
		const states = listTranslationStates({
			collection,
			localization,
			content: content(
				{ en: "Hello", fr: "Salut", de: "Hallo" },
				{
					translationSources: {
						fr: { source: hash("Hello"), origin: "ai", output: hash("Salut") },
						de: { source: hash("Hi"), origin: "person" },
					},
				},
			),
		});

		expect(states).toEqual([
			{
				locale: "fr",
				fields: [{ brick: null, path: ["title"], state: "current" }],
			},
			{
				locale: "de",
				fields: [{ brick: null, path: ["title"], state: "byPersonOutdated" }],
			},
		]);
	});
});

describe("translation fixes", () => {
	test("a translated link label keeps the translation's own URL and target", () => {
		expect(
			fieldHooks.link.translation?.write("Contact FR", {
				source: { url: "/en/contact", target: "_self", label: "Contact" },
				current: { url: "/fr/contact", target: null, label: null },
			}),
		).toEqual({ url: "/fr/contact", target: null, label: "Contact FR" });
		expect(
			fieldHooks.link.translation?.write("Contact FR", {
				source: { url: "/en/contact", target: "_self", label: "Contact" },
				current: { url: null, target: null, label: null },
			}),
		).toEqual({ url: "/en/contact", target: "_self", label: "Contact FR" });
	});

	test("applying leaves a translation a person saved meanwhile, unless overwriting", () => {
		const current = content({ en: "Hello", fr: "Bonjour" });
		const change = {
			brick: null,
			path: ["title"],
			locale: "fr",
			value: "Salut",
			source: { source: hash("Hello"), origin: "ai", output: hash("Salut") },
		} as const;

		const kept = applyTranslationChanges({
			collection,
			localization,
			content: current,
			changes: [change],
			overwrite: false,
		});
		const replaced = applyTranslationChanges({
			collection,
			localization,
			content: current,
			changes: [change],
			overwrite: true,
		});

		expect(titleField(kept)?.translations?.fr).toBe("Bonjour");
		expect(titleField(replaced)?.translations?.fr).toBe("Salut");
	});

	test("applying keeps a link URL changed while the translation was being made", () => {
		const applied = applyTranslationChanges({
			collection,
			localization,
			content: {
				fields: [
					{
						key: "cta",
						type: "link",
						translations: {
							en: { url: "/en", target: null, label: "Contact" },
							fr: { url: "/fr/new", target: null, label: null },
						},
					},
				],
			},
			changes: [
				{
					brick: null,
					path: ["cta"],
					locale: "fr",
					value: { url: "/fr/old", target: null, label: "Contactez-nous" },
					source: {
						source: hash("Contact"),
						origin: "ai",
						output: hash("Contactez-nous"),
					},
				},
			],
			overwrite: false,
		});

		expect(applied.fields?.[0]?.translations?.fr).toEqual({
			url: "/fr/new",
			target: null,
			label: "Contactez-nous",
		});
	});

	test("merging a locale brings along the embedded bricks its values point at", () => {
		const body = (ref: string) => ({
			type: "doc",
			content: [{ type: "lucidEmbeddedBrick", attrs: { ref } }],
		});
		const quote = {
			ref: "q1",
			key: "quote",
			order: 0,
			type: "embedded" as const,
			fields: [
				{ key: "quoteText", type: "text" as const, translations: { en: "Hi" } },
			],
		};

		const merged = mergeLocaleContent({
			collection,
			localization,
			target: {
				fields: [
					{
						key: "body",
						type: "rich-text",
						translations: { en: null, fr: null },
					},
				],
				bricks: [],
			},
			source: {
				fields: [
					{
						key: "body",
						type: "rich-text",
						translations: { en: null, fr: body("q1") },
					},
				],
				bricks: [quote],
			},
			locales: ["fr"],
		});

		expect(merged.bricks).toEqual([quote]);
	});

	test("checking a translation without changing it counts as a change to its locale", () => {
		expect([
			...getChangedLocales({
				collection,
				localization,
				previous: content(
					{ en: "Hello", fr: "Salut" },
					{
						translationSources: {
							fr: { source: hash("Hi"), origin: "ai", output: hash("Salut") },
						},
					},
				),
				next: content(
					{ en: "Hello", fr: "Salut" },
					{
						translationSources: {
							fr: { source: hash("Hello"), origin: "person" },
						},
					},
				),
			}),
		]).toEqual(["fr"]);
	});

	test("a translation holding only the field's default counts as missing, not a person's", () => {
		const next: ContentInput = {
			fields: [
				{
					key: "button",
					type: "text",
					translations: { en: "Read on", fr: "Learn more", de: "Learn more" },
				},
			],
		};
		stampTranslationSources({
			collection,
			localization,
			previous: {
				fields: [
					{ key: "button", type: "text", translations: { en: "Read on" } },
				],
			},
			next,
		});

		expect(next.fields?.[0]?.translationSources).toBeUndefined();
		expect(
			getTranslationStatus({ collection, localization, content: next }).map(
				(status) => status.missing,
			),
		).toEqual([1, 1]);
	});
});
