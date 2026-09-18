import type { FieldError, InternalDocumentField } from "@types";
import { createMemo, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { describe, expect, it } from "vitest";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { createFieldStates, readDocumentRoute } from "./field-state";

const configs: CollectionFieldConfig[] = [
	{
		key: "content",
		type: "tab",
		details: {},
		fields: [
			{ key: "title", type: "text", details: {}, localized: true },
			{
				key: "items",
				type: "repeater",
				details: {},
				fields: [{ key: "title", type: "text", details: {}, localized: true }],
			},
		],
	},
];
const fields: InternalDocumentField[] = [
	{
		key: "title",
		type: "text",
		value: "Shared",
		translations: { en: "English", fr: "Français" },
	},
	{
		key: "items",
		type: "repeater",
		groups: [
			{
				ref: "one",
				order: 0,
				open: true,
				fields: [
					{
						key: "title",
						type: "text",
						translations: { en: "First", fr: "Premier" },
					},
				],
			},
			{
				ref: "two",
				order: 1,
				open: true,
				fields: [
					{
						key: "title",
						type: "text",
						translations: { en: "Second", fr: "Deuxième" },
					},
				],
			},
		],
	},
];
describe("extension editor state", () => {
	it("tracks unsaved values and the selected content locale", () =>
		createRoot((dispose) => {
			const [state, set] = createStore({
				fields: structuredClone(fields),
				locale: "en",
			});
			const view = createMemo(() =>
				createFieldStates({
					configs,
					fields: state.fields,
					contentLocale: state.locale,
					localized: true,
					readOnly: false,
				}),
			);
			expect(view()[0]?.value).toBe("English");
			set("fields", 0, "translations", "en", "Unsaved edit");
			expect(view()[0]?.value).toBe("Unsaved edit");
			set("locale", "fr");
			expect(view()[0]?.value).toBe("Français");
			dispose();
		}));
	it("keeps repeater identity, values and errors in their own group", () => {
		const errors: FieldError[] = [
			{
				key: "items",
				localeCode: null,
				message: { type: "lucid.literal", value: "Invalid items" },
				groupErrors: [
					{
						ref: "two",
						order: 1,
						fields: [
							{
								key: "title",
								localeCode: "fr",
								message: {
									type: "lucid.literal",
									value: "Use {{minimum}} characters",
									values: { minimum: 5 },
								},
							},
						],
					},
				],
			},
		];
		const view = createFieldStates({
			configs,
			fields,
			errors,
			contentLocale: "fr",
			localized: true,
			readOnly: true,
		});
		const repeater = view[1];
		if (repeater?.type !== "repeater") throw Error("Expected a repeater");
		expect(repeater.groups.map((group) => group.ref)).toEqual(["one", "two"]);
		expect(repeater.groups[0]?.fields[0]?.value).toBe("Premier");
		expect(repeater.groups[0]?.fields[0]?.errors).toEqual([]);
		expect(repeater.groups[1]?.fields[0]?.errors).toEqual(["Use 5 characters"]);
		expect(repeater.groups[1]?.fields[0]?.readOnly).toBe(true);
	});
	it("uses the shared value for a collection without localization", () => {
		const view = createFieldStates({
			configs,
			fields,
			contentLocale: "fr",
			localized: false,
			readOnly: false,
		});
		expect(view[0]?.value).toBe("Shared");
	});
});

describe("extension document route", () => {
	it("tracks unsaved localized routes inside structural fields", () =>
		createRoot((dispose) => {
			const [state, set] = createStore({
				fields: structuredClone(fields),
				locale: "en",
			});
			const route = createMemo(() =>
				readDocumentRoute({
					field: "title",
					configs,
					fields: state.fields,
					contentLocale: state.locale,
					localized: true,
				}),
			);
			expect(route()).toEqual({ field: "title", path: "English" });
			set("fields", 0, "translations", "en", "/unsaved-route");
			expect(route()?.path).toBe("/unsaved-route");
			set("locale", "fr");
			expect(route()?.path).toBe("Français");
			set("locale", "de");
			expect(route()?.path).toBeUndefined();
			dispose();
		}));

	it("reads shared routes and leaves unconfigured routes absent", () => {
		const options = { configs, fields, contentLocale: "fr", localized: false };
		expect(readDocumentRoute({ ...options, field: "title" })).toEqual({
			field: "title",
			path: "Shared",
		});
		expect(readDocumentRoute({ ...options, field: undefined })).toBeUndefined();
		expect(
			readDocumentRoute({ ...options, field: "missing" })?.path,
		).toBeUndefined();
	});
});
