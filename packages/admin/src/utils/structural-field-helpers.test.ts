import type { FieldError } from "@types";
import { describe, expect, it } from "vitest";
import type { CollectionFieldConfig } from "@/types/collection-config";
import {
	countFieldErrors,
	countFieldErrorsForKeys,
	countStructuralFieldErrors,
	getStructuralFieldKeys,
} from "./structural-field-helpers";

const structuralFields = [
	{
		key: "content",
		type: "tab",
		fields: [
			{
				key: "details",
				type: "section",
				fields: [
					{ key: "title", type: "text" },
					{
						key: "items",
						type: "repeater",
						fields: [
							{
								key: "advanced",
								type: "collapsible",
								fields: [{ key: "description", type: "textarea" }],
							},
						],
					},
				],
			},
		],
	},
] as unknown as CollectionFieldConfig[];

describe("structural field helpers", () => {
	it("collects nested structural and data field keys", () => {
		expect(Array.from(getStructuralFieldKeys(structuralFields))).toEqual([
			"content",
			"details",
			"title",
			"items",
			"advanced",
			"description",
		]);
	});

	it("counts direct and nested repeater group errors", () => {
		const errors: FieldError[] = [
			{
				key: "items",
				localeCode: null,
				message: {
					type: "lucid.literal",
					value: "Items are invalid",
				},
				groupErrors: [
					{
						ref: "group-1",
						order: 0,
						fields: [
							{
								key: "description",
								localeCode: "en",
								message: {
									type: "lucid.literal",
									value: "Description is required",
								},
							},
						],
					},
				],
			},
		];

		expect(countFieldErrors(errors)).toBe(2);
	});

	it("only counts errors belonging to the structural descendants", () => {
		const errors: FieldError[] = [
			{
				key: "title",
				localeCode: "en",
				message: {
					type: "lucid.literal",
					value: "Title is required",
				},
			},
			{
				key: "unrelated",
				localeCode: "en",
				message: {
					type: "lucid.literal",
					value: "Unrelated error",
				},
			},
		];

		expect(countStructuralFieldErrors(structuralFields, errors)).toBe(1);
	});

	it("counts errors using a precomputed field-key set", () => {
		const errors: FieldError[] = [
			{
				key: "items",
				localeCode: null,
				message: {
					type: "lucid.literal",
					value: "Items are invalid",
				},
				groupErrors: [
					{
						ref: "group-1",
						order: 0,
						fields: [
							{
								key: "description",
								localeCode: "en",
								message: {
									type: "lucid.literal",
									value: "Description is required",
								},
							},
						],
					},
				],
			},
			{
				key: "unrelated",
				localeCode: "en",
				message: {
					type: "lucid.literal",
					value: "Unrelated error",
				},
			},
		];

		expect(countFieldErrorsForKeys(errors, new Set(["items"]))).toBe(2);
	});
});
