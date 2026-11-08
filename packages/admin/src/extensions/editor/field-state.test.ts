import type { InternalDocumentField } from "@types";
import { createMemo, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import { describe, expect, it } from "vitest";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { createFieldState, readDocumentRoute } from "./field-state";

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
describe("listed field state", () => {
	it("reads the content locale and drops values of another shape", () => {
		const title = createFieldState({
			config: { key: "title", type: "text", details: {}, localized: true },
			data: fields[0],
			contentLocale: "fr",
			localized: true,
		});
		expect(title.value).toBe("Français");

		const count = createFieldState({
			config: { key: "title", type: "number", details: {} },
			data: fields[0],
			contentLocale: "fr",
			localized: true,
		});
		expect(count.value).toBeUndefined();
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
