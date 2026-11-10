import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldScopeProvider } from "@/hooks/useFieldScope/useFieldScope";
import { createBrickStore } from "@/store/brickStore/brickStore";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import FieldSlots from "./FieldSlots";
import type { FieldSlotProps } from "./types";

const Palette = (props: FieldSlotProps<{ show: boolean }>) => {
	// ----------------------------------------
	// Render
	return props.options.show && <p>Palette for {props.field.key}</p>;
};

const slots = vi.hoisted(() => ({ fieldSlots: [] as unknown[] }));
vi.mock("virtual:lucid-admin", () => slots);

const config: CollectionLeafFieldConfig = {
	key: "accent",
	type: "color",
	details: {},
	presets: [],
};

const cleanups: Array<() => void> = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

/** Renders the input slot for an accent colour field, with the built-in input as its fallback. */
const renderInput = (show: boolean) => {
	slots.fieldSlots = [
		{
			key: "palette",
			slot: "field.input",
			match: { fieldType: "color" },
			options: { show },
			component: Palette,
		},
	];
	const store = createBrickStore();
	store.set("bricks", [
		{
			key: "hero",
			ref: "hero",
			type: "builder",
			open: true,
			order: 0,
			fields: [{ key: "accent", type: "color", value: "#000" }],
		},
	]);

	const container = document.createElement("div");
	cleanups.push(
		render(
			() => (
				<FieldScopeProvider
					environment={{
						store,
						contentLocale: () => "en",
						editableLocales: () => null,
						locales: () => ["en"],
						collectionKey: () => "page",
					}}
					level={{
						brickIndex: () => 0,
						configs: () => [config],
						fields: () => store.get.bricks[0]?.fields ?? [],
						errors: () => [],
						access: () => "editable",
					}}
				>
					<FieldSlots slot="field.input" config={config}>
						<p>Built-in input</p>
					</FieldSlots>
				</FieldScopeProvider>
			),
			container,
		),
	);
	return container;
};

describe("field input slots", () => {
	it("replace the built-in input", () => {
		expect(renderInput(true).textContent).toBe("Palette for accent");
	});

	it("keep the built-in input when they render nothing", () => {
		expect(renderInput(false).textContent).toBe("Built-in input");
	});
});
