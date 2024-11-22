import { expect, test } from "vitest";
import flattenFields from "./flatten-fields.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";

const pagesCollection = new CollectionBuilder("pages", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
	config: {
		useTranslations: true,
	},
})
	.addText("page_title")
	.addRepeater("call_to_actions")
	.addText("cta_title")
	.endRepeater();

test("flatten fields - group object[] variation", async () => {
	const flatten = flattenFields(
		[
			{
				key: "page_title",
				type: "text",
				translations: {
					en: "Homepage",
					fr: "Accueil",
				},
			},
			{
				key: "call_to_actions",
				type: "repeater",
				groups: [
					{
						id: "ref-group1",
						open: 0,
						fields: [
							{
								key: "cta_title",
								type: "text",
								translations: {
									en: "Call to action",
									fr: "Appel à action",
								},
							},
						],
					},
					{
						id: "ref-group2",
						open: 0,
						fields: [
							{
								key: "cta_title",
								type: "text",
								translations: {
									en: "Call to action",
									fr: "Appel à action",
								},
							},
						],
					},
				],
			},
		],
		{
			locales: [
				{
					label: "English",
					code: "en",
				},
				{
					label: "French",
					code: "fr",
				},
			],
			defaultLocale: "en",
		},
		pagesCollection,
	);

	// expect we have the correct number of fields and groups
	expect(flatten.fields.length).toBe(6);
	expect(flatten.groups.length).toBe(2);

	// useing the given group refs, expect the correct number of fields
	const refGroup1Fields = flatten.fields.filter(
		(f) => f.groupId === "ref-group1",
	);
	expect(refGroup1Fields.length).toBe(2);

	const refGroup2Fields = flatten.fields.filter(
		(f) => f.groupId === "ref-group2",
	);
	expect(refGroup2Fields.length).toBe(2);

	// check generated groupRefs have been assigned correctly
	for (let i = 0; i < flatten.groups.length; i++) {
		const group = flatten.groups[i];
		if (group === undefined) continue;
		const fields = flatten.fields.filter((f) => f.groupRef === group.ref);
		expect(fields.length).toBe(2);
	}
});

test("flatten fields - simple group [][] variation", async () => {
	const flatten = flattenFields(
		[
			{
				key: "page_title",
				type: "text",
				translations: {
					en: "Homepage",
					fr: "Accueil",
				},
			},
			{
				key: "call_to_actions",
				type: "repeater",
				groups: [
					[
						{
							key: "cta_title",
							type: "text",
							translations: {
								en: "Call to action",
								fr: "Appel à action",
							},
						},
					],
					[
						{
							key: "cta_title",
							type: "text",
							translations: {
								en: "Call to action",
								fr: "Appel à action",
							},
						},
					],
				],
			},
		],
		{
			locales: [
				{
					label: "English",
					code: "en",
				},
				{
					label: "French",
					code: "fr",
				},
			],
			defaultLocale: "en",
		},
		pagesCollection,
	);

	// expect we have the correct number of fields and groups
	expect(flatten.fields.length).toBe(6);
	expect(flatten.groups.length).toBe(2);

	// check generated groupRefs have been assigned correctly
	for (let i = 0; i < flatten.groups.length; i++) {
		const group = flatten.groups[i];
		if (group === undefined) continue;
		const fields = flatten.fields.filter((f) => f.groupRef === group.ref);
		expect(fields.length).toBe(2);
	}
});
