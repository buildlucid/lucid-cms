import { defineBrick, defineCollection, field } from "@lucidcms/core";

export const ARTICLE_KEY = "mig-article";

type ArticleFields = Parameters<typeof defineCollection>[0]["fields"];
type ArticleBricks = Parameters<typeof defineCollection>[0]["bricks"];

/** One version of the article collection. Every version shares a key, so each is a change to the same tables. */
const article = (fields: ArticleFields, bricks?: ArticleBricks) =>
	defineCollection({
		key: ARTICLE_KEY,
		mode: "multiple",
		details: {
			labels: { singular: "Migration article", plural: "Migration articles" },
		},
		fields,
		bricks,
	});

const QuoteBrick = defineBrick({
	key: "mig-quote",
	details: { label: "Quote" },
	fields: [field.text("quote")],
});

/** Where every article scenario starts. */
export const baseArticle = article([
	field.text("title", { useAsLabel: true }),
	field.textarea("summary"),
	field.number("rating"),
]);

/** Adds a field, an index, a repeater and a brick, none of which touch stored content. */
export const addedArticle = article(
	[
		field.text("title", { useAsLabel: true, index: true }),
		field.textarea("summary"),
		field.number("rating"),
		field.text("subtitle"),
		field.repeater("links", { fields: [field.text("link_label")] }),
	],
	{ builder: [QuoteBrick] },
);

/** Drops the summary field from the config. */
export const removedArticle = article([
	field.text("title", { useAsLabel: true }),
	field.number("rating"),
]);

/** Stores the rating as text instead of a number, which cannot keep the stored ratings. */
export const retypedArticle = article([
	field.text("title", { useAsLabel: true }),
	field.textarea("summary"),
	field.text("rating"),
]);

/** Changes only default values. */
export const defaultsArticle = article([
	field.text("title", { useAsLabel: true, default: "Untitled" }),
	field.textarea("summary"),
	field.number("rating", { default: 3 }),
]);
