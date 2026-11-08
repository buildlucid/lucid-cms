import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { createBrickStore } from "@/store/brickStore/brickStore";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { createFieldScope } from "./field-scope";

const configs: CollectionFieldConfig[] = [
	{
		key: "content",
		type: "tab",
		details: {},
		fields: [
			{ key: "title", type: "text", details: {}, localized: true },
			{ key: "price", type: "number", details: {} },
			{ key: "image", type: "media", details: {}, resource: "media" },
			{
				key: "items",
				type: "repeater",
				details: {},
				fields: [{ key: "label", type: "text", details: {}, localized: true }],
			},
		],
	},
];

/** A builder brick with a localized title, a price and one repeater item, but no image field yet. */
const setup = (options?: { editableLocales?: string[] }) => {
	const store = createBrickStore();
	store.set("collectionLocalized", true);
	store.set("bricks", [
		{
			key: "hero",
			ref: "hero",
			type: "builder",
			open: true,
			order: 0,
			fields: [
				{ key: "title", type: "text", translations: { en: "Hello" } },
				{ key: "price", type: "number", value: 10 },
				{
					key: "items",
					type: "repeater",
					groups: [
						{
							ref: "one",
							order: 0,
							open: true,
							fields: [
								{ key: "label", type: "text", translations: { en: "First" } },
							],
						},
					],
				},
			],
		},
	]);
	store.get.captureInitialSnapshot();

	const [locale, setLocale] = createSignal("en");
	const [access, setAccess] = createSignal<"editable" | "locked">("editable");
	const scope = createFieldScope(
		{
			store,
			contentLocale: locale,
			editableLocales: () => options?.editableLocales ?? null,
			locales: () => ["en", "fr"],
			collectionKey: () => "page",
		},
		{
			brickIndex: () => 0,
			configs: () => configs,
			fields: () => store.get.bricks[0]?.fields ?? [],
			errors: () => [],
			access,
		},
	);

	return { store, scope, setLocale, setAccess };
};

describe("field scopes", () => {
	it("keeps handles current with unsaved edits and the content locale", () =>
		createRoot((dispose) => {
			const { store, scope, setLocale } = setup();
			const title = scope.get("title", "text");

			expect(title?.value).toBe("Hello");
			store.set("bricks", 0, "fields", 0, "translations", "en", "Edited");
			expect(title?.value).toBe("Edited");
			setLocale("fr");
			expect(title?.value).toBeUndefined();
			dispose();
		}));

	it("only returns fields of the type asked for", () => {
		const { scope } = setup();

		expect(scope.get("title", "number")).toBeUndefined();
		expect(scope.get("missing")).toBeUndefined();
		expect(scope.get("price", "number")?.value).toBe(10);
	});

	it("writes in the content locale as an undoable step", () => {
		const { store, scope } = setup();

		scope.get("title", "text")?.setValue("Hi");

		expect(store.get.bricks[0]?.fields[0]?.translations?.en).toBe("Hi");
		expect(store.edits.canUndo()).toBe(true);
	});

	it("writes inside its own repeater item", () => {
		const { store, scope } = setup();
		const item = scope.get("items", "repeater")?.groups[0];

		item?.fields.get("label", "text")?.setValue("Changed");

		expect(
			store.get.bricks[0]?.fields[2]?.groups?.[0]?.fields[0]?.translations?.en,
		).toBe("Changed");
	});

	it("keeps repeater item handles current after undo replaces the item", () => {
		const { store, scope } = setup();
		const label = scope
			.get("items", "repeater")
			?.groups[0]?.fields.get("label", "text");

		label?.setValue("Changed");
		store.edits.undo();

		expect(label?.value).toBe("First");
	});

	it("follows access changes on handles it has already given out", () => {
		const { scope, setAccess } = setup();
		const price = scope.get("price", "number");

		setAccess("locked");

		expect(price?.readOnly).toBe(true);
	});

	it("creates a field before writing when it doesn't exist yet", () => {
		const { store, scope } = setup();

		scope.get("image", "media")?.setValue([5]);

		expect(
			store.get.bricks[0]?.fields.find((field) => field.key === "image")?.value,
		).toEqual([5]);
	});

	it("ignores writes the user or document can't make", () => {
		const localeLimited = setup({ editableLocales: ["fr"] });
		localeLimited.scope.get("title", "text")?.setValue("Blocked");
		expect(localeLimited.store.get.bricks[0]?.fields[0]?.translations?.en).toBe(
			"Hello",
		);

		const { store, scope } = setup();
		store.set("locked", true);
		scope.get("price", "number")?.setValue(20);
		expect(store.get.bricks[0]?.fields[1]?.value).toBe(10);
	});

	it("rejects values that don't fit the field type", () => {
		const { scope } = setup();
		const price = scope.get("price", "number");

		// @ts-expect-error - a plugin written in JavaScript could pass anything
		expect(() => price?.setValue("20")).toThrow(TypeError);
	});
});
