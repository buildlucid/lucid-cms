import { describe, expect, test } from "vitest";
import defineCollection from "../../../../libs/collection/define-collection.js";
import field from "../../../../libs/collection/definitions/fields/field.js";
import prepareTransferData from "./prepare-transfer-data.js";

const localization = {
	defaultLocale: "en",
	locales: [
		{ code: "en", label: "English" },
		{ code: "fr", label: "French" },
	],
};
const pages = (localized: boolean) =>
	defineCollection({
		key: "pages",
		mode: "multiple",
		localized,
		details: { labels: { singular: "Page", plural: "Pages" } },
		fields: [
			field.text("title", { localized: true }),
			field.json("settings", { localized: false }),
		],
	});

const prepare = (props: {
	localized: boolean;
	data: Record<string, unknown>;
	source?: { fields: string[]; bricks: Record<string, string[]> };
}) =>
	prepareTransferData({
		context: { collection: pages(props.localized), localization },
		data: { fields: props.data },
		localized: props.source,
		map: (ref) => ref.id,
	}).data.fields;

describe("prepareTransferData localization", () => {
	test("fills the default locale with values the source site didn't localize", () => {
		expect(
			prepare({
				localized: true,
				data: { title: "Hello" },
				source: { fields: [], bricks: {} },
			}),
		).toMatchObject({ title: { en: "Hello" } });
	});

	test("keeps the default locale's value for fields this site doesn't localize", () => {
		expect(
			prepare({
				localized: false,
				data: { title: { en: "Hello", fr: "Bonjour" } },
				source: { fields: ["title"], bricks: {} },
			}),
		).toMatchObject({ title: "Hello" });
	});

	test("leaves values whose keys look like locales alone when neither site localizes them", () => {
		const settings = { en: { key: "one" }, fr: { key: "two" } };
		expect(
			prepare({
				localized: true,
				data: { settings },
				source: { fields: ["title"], bricks: {} },
			}),
		).toMatchObject({ settings });
	});
});
