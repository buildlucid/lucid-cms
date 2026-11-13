import { createSignal, Show } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, expect, test, vi } from "vitest";
import type { BuilderPreview } from "@/hooks/useBuilderPreview/useBuilderPreview";
import {
	DocumentPreviewProvider,
	usePreviewContext,
} from "@/hooks/useDocumentPreview/useDocumentPreview";
import type { PreviewToolbarSlotProps } from "../types";
import { PreviewToolbar } from "./PreviewToolbar";

const Inspect = (props: PreviewToolbarSlotProps) => {
	// ----------------------------------------
	// Render
	return <button type="button">{props.key}</button>;
};

const slots = vi.hoisted(() => ({ documentPreviewSlots: [] as unknown[] }));
vi.mock("virtual:lucid-admin", () => slots);

const cleanups: Array<() => void> = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

/** Stands in for a preview part, adding built-in items while it's mounted. */
const Part = () => {
	// ----------------------------------------
	// State & Hooks
	const context = usePreviewContext();
	context.addToolbarItems(
		(["zoom", "edit", "open"] as const).map((key) => ({
			key,
			render: () => <button type="button">{key}</button>,
		})),
	);

	// ----------------------------------------
	// Render
	return null;
};

test("places plugin items among the built-in items the mounted parts add", () => {
	slots.documentPreviewSlots = [
		{
			key: "inspect",
			slot: "document.previewToolbar",
			match: { collection: "page" },
			position: { before: "edit" },
			component: Inspect,
		},
		{
			key: "elsewhere",
			slot: "document.previewToolbar",
			match: { collection: "post" },
			component: Inspect,
		},
	];
	//* the toolbar only reads the collection from the preview
	const preview = {
		document: { collectionKey: () => "page" },
	} as unknown as BuilderPreview;
	const [mounted, setMounted] = createSignal(true);
	const container = document.createElement("div");
	cleanups.push(
		render(
			() => (
				<DocumentPreviewProvider preview={preview} open={() => true}>
					<Show when={mounted()}>
						<Part />
					</Show>
					<PreviewToolbar />
				</DocumentPreviewProvider>
			),
			container,
		),
	);
	const labels = () =>
		[...container.querySelectorAll("button")].map(
			(button) => button.textContent,
		);

	expect(labels()).toEqual(["zoom", "inspect", "edit", "open"]);
	expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
	setMounted(false);
	expect(labels()).toEqual(["inspect"]);
});
