import { z } from "@lucidcms/core";
import { describe, expect, test } from "vitest";
import { defineForm, defineFormFieldType, formField } from "../index.js";
import parsePluginOptions from "./parse-plugin-options.js";

const upload = (given: { store?: boolean } = {}) =>
	defineForm({ key: "apply", fields: [formField.upload("cv")], ...given });

describe("forms plugin options", () => {
	test("serve builder forms from the last environment, or latest without one", () => {
		const staged = parsePluginOptions({
			builder: {
				publishing: {
					environments: [
						{ key: "staging", label: "Staging" },
						{ key: "production", label: "Production" },
					],
				},
			},
		});

		expect(parsePluginOptions().builder).toMatchObject({ version: "latest" });
		expect(staged.builder).toMatchObject({ version: "production" });
	});

	test("give forms the plugin's retention unless they set their own", () => {
		const options = parsePluginOptions({
			submissions: { retentionDays: 30 },
			definitions: [
				defineForm({ key: "a", fields: [] }),
				defineForm({ key: "b", fields: [], retentionDays: 7 }),
				defineForm({ key: "c", fields: [], retentionDays: false }),
			],
		});

		expect(options.forms.map((form) => form.retentionDays)).toEqual([
			30,
			7,
			null,
		]);
	});

	test("take project field types beside the built-in ones", () => {
		const rating = defineFormFieldType({
			key: "rating",
			label: "Rating",
			control: "number",
			schema: () => z.coerce.number().int().min(1).max(5),
		});
		const options = parsePluginOptions({
			fieldTypes: [rating],
			definitions: [
				defineForm({
					key: "review",
					fields: [formField.custom("rating", "stars", { max: 5 })],
				}),
			],
		});

		expect(options.forms[0]?.fields[0]).toMatchObject({
			type: "rating",
			control: "number",
			name: "stars",
			settings: { max: 5 },
		});
	});

	test.for([
		["a repeated form key", { definitions: [upload(), upload()] }],
		[
			"a field type that isn't defined",
			{
				definitions: [
					defineForm({
						key: "a",
						fields: [formField.custom("rating", "stars")],
					}),
				],
			},
		],
		[
			"a repeated field name",
			{
				definitions: [
					defineForm({
						key: "a",
						fields: [formField.text("name"), formField.email("name")],
					}),
				],
			},
		],
		[
			"a field named after what every object has",
			{
				definitions: [
					defineForm({ key: "a", fields: [formField.text("constructor")] }),
				],
			},
		],
		[
			"a redirect that isn't a website path or web address",
			{
				definitions: [
					defineForm({
						key: "a",
						fields: [],
						confirmation: { type: "redirect", url: "javascript:alert(1)" },
					}),
				],
			},
		],
		[
			"a field name that doesn't fit a token",
			{
				definitions: [
					defineForm({ key: "a", fields: [formField.text("full name")] }),
				],
			},
		],
		[
			"a built-in field type defined again",
			{
				fieldTypes: [
					defineFormFieldType({
						key: "text",
						label: "Text",
						control: "text",
						schema: () => z.string(),
					}),
				],
			},
		],
		[
			"files on a form that doesn't store its submissions",
			{
				definitions: [upload({ store: false })],
			},
		],
		[
			"files without the submissions collection",
			{
				definitions: [upload()],
				submissions: false,
			},
		],
	] as const)("refuse %s", ([, given]) => {
		expect(() => parsePluginOptions(given)).toThrow();
	});

	test("reads code-defined forms' text in the locale asked for, or the default", () => {
		const options = parsePluginOptions({
			definitions: [
				defineForm({
					key: "contact",
					submitLabel: { en: "Send", fr: "Envoyer" },
					fields: [
						formField.select("topic", {
							label: { en: "Topic", fr: "Sujet" },
							help: "Same in every language",
							options: [
								{ label: { en: "Sales", fr: "Ventes" }, value: "sales" },
							],
						}),
					],
					emails: [
						{ to: "team@example.com", subject: { en: "New", fr: "Nouveau" } },
					],
				}),
			],
		});
		const read = (current?: string) =>
			options.readCodeForm("contact", { current, default: "en" });

		expect(read("fr")).toMatchObject({
			submitLabel: "Envoyer",
			fields: [
				{
					label: "Sujet",
					help: "Same in every language",
					settings: { options: [{ label: "Ventes", value: "sales" }] },
				},
			],
			emails: [{ subject: "Nouveau" }],
		});
		//* a locale the text doesn't have falls back to the default one's
		expect(read("de")?.submitLabel).toBe("Send");
		expect(options.readCodeForm("missing", {})).toBeNull();
	});
});
