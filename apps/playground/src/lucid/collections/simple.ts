import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import SimpleBrick from "../bricks/simple.js";
import SimpleFixedBrick from "../bricks/simple-fixed.js";

const SimpleCollection = new CollectionBuilder("simple", {
	mode: "multiple",
	details: {
		name: "Simple",
		singularName: "Simple",
	},
	config: {
		useTranslations: true,
		useDrafts: true,
		useRevisions: true,
	},
	bricks: {
		builder: [SimpleBrick, SimpleFixedBrick],
		fixed: [SimpleFixedBrick],
	},
})
	.addText("simpleHeading", {
		details: {
			label: {
				en: "Heading Default",
			},
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		collection: {
			column: true,
			filterable: true,
		},
	})
	.addRepeater("people")
	.addText("firstName")
	.endRepeater();

export default SimpleCollection;

const test = {
	bricks: [
		{
			id: -1,
			key: "simple-fixed",
			order: 0,
			open: true,
			type: "fixed",
			fields: [
				{
					key: "heading",
					type: "text",
					value: "I am the fixed brick heading",
					meta: null,
				},
			],
		},
		{
			id: -1,
			key: "simple",
			order: 1,
			open: true,
			type: "builder",
			fields: [
				{
					key: "heading",
					type: "text",
					value: "I am the heading",
					meta: null,
				},
				{ key: "image", type: "media", value: 1, meta: null },
				{ key: "document", type: "document", value: 1, meta: null },
				{
					key: "items",
					type: "repeater",
					groups: [
						{
							id: "ignore",
							order: 0,
							open: false,
							fields: [
								{
									key: "itemTitle",
									type: "text",
									translations: { en: "BRICK 2 - Title One", fr: null },
									meta: { en: null, fr: null },
								},
								{
									key: "nestedItems",
									type: "repeater",
									groups: [
										{
											id: "ignore",
											order: 0,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "BRICK 2 - Nested Title One One",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
										{
											id: "ignore",
											order: 1,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "BRICK 2 - Nested Title One Two",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 0,
													meta: null,
												},
											],
										},
									],
								},
							],
						},
						{
							id: "ignore",
							order: 1,
							open: true,
							fields: [
								{
									key: "itemTitle",
									type: "text",
									translations: { en: "BRICK 2 - Title Two", fr: null },
									meta: { en: null, fr: null },
								},
								{
									key: "nestedItems",
									type: "repeater",
									groups: [
										{
											id: "ignore",
											order: 0,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "BRICK 2 - Nested Title Two One",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
										{
											id: "ignore",
											order: 1,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "BRICK 2 - Nested Title Two Two",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
		{
			id: -1,
			key: "simple",
			order: 2,
			open: true,
			type: "builder",
			fields: [
				{
					key: "heading",
					type: "text",
					value: "I am the heading",
					meta: null,
				},
				{ key: "image", type: "media", value: 1, meta: null },
				{ key: "document", type: "document", value: 1, meta: null },
				{
					key: "items",
					type: "repeater",
					groups: [
						{
							id: "ignore",
							order: 0,
							open: false,
							fields: [
								{
									key: "itemTitle",
									type: "text",
									translations: { en: "Title One", fr: null },
									meta: { en: null, fr: null },
								},
								{
									key: "nestedItems",
									type: "repeater",
									groups: [
										{
											id: "ignore",
											order: 0,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "Nested Title One One",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
										{
											id: "ignore",
											order: 1,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "Nested Title One Two",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 0,
													meta: null,
												},
											],
										},
									],
								},
							],
						},
						{
							id: "ignore",
							order: 1,
							open: true,
							fields: [
								{
									key: "itemTitle",
									type: "text",
									translations: { en: "Title Two", fr: null },
									meta: { en: null, fr: null },
								},
								{
									key: "nestedItems",
									type: "repeater",
									groups: [
										{
											id: "ignore",
											order: 0,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "Nested Title Two One",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
										{
											id: "ignore",
											order: 1,
											open: false,
											fields: [
												{
													key: "nestedItemTitle",
													type: "text",
													translations: {
														en: "Nested Title Two Two",
														fr: null,
													},
													meta: { en: null, fr: null },
												},
												{
													key: "nestedCheckbox",
													type: "checkbox",
													value: 1,
													meta: null,
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
	],
	fields: [
		{
			key: "simpleHeading",
			type: "text",
			translations: { en: "Homepage", fr: "Homepage FR" },
			meta: { en: null, fr: null },
		},
		{
			key: "people",
			type: "repeater",
			groups: [
				{
					id: "ignore",
					order: 0,
					open: false,
					fields: [
						{
							key: "firstName",
							type: "text",
							translations: { en: "John", fr: null },
							meta: { en: null, fr: null },
						},
					],
				},
				{
					id: "ignore",
					order: 1,
					open: false,
					fields: [
						{
							key: "firstName",
							type: "text",
							translations: { en: "William", fr: null },
							meta: { en: null, fr: null },
						},
					],
				},
			],
		},
	],
};
