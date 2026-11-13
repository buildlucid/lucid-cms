import { type Component, createMemo, For } from "solid-js";
import { documentPreviewSlots } from "virtual:lucid-admin";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { matchSlots } from "@/extensions/match-slots";
import { usePreviewContext } from "@/hooks/useDocumentPreview/useDocumentPreview";
import T from "@/translations";
import { placeToolbarItems } from "../utils/place-toolbar-items";

type ToolbarEntry = Extract<
	(typeof documentPreviewSlots)[number],
	{ slot: "document.previewToolbar" }
>;

/** The preview header's controls: the built-in items the preview's parts show, with plugin items placed among them. */
export const PreviewToolbar: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const context = usePreviewContext();

	// ----------------------------------------
	// Memos
	const entries = createMemo(() =>
		matchSlots(documentPreviewSlots, {
			collection: context.preview.document.collectionKey(),
		}).filter(
			(entry): entry is ToolbarEntry =>
				entry.slot === "document.previewToolbar",
		),
	);
	const placed = createMemo(() =>
		placeToolbarItems(context.toolbarItems(), entries()),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			role="group"
			aria-label={T()("preview.options")}
			class="flex min-w-0 items-center gap-1"
		>
			<For each={placed()}>
				{(item) => {
					if ("divider" in item) {
						return (
							<span
								aria-hidden="true"
								class="mx-1 h-4 w-px shrink-0 bg-border"
							/>
						);
					}
					if ("render" in item) return item.render();
					return (
						<div data-admin-slot={item.key} class="flex shrink-0 items-center">
							<AdminExtensionBoundary name={item.key} placement="header">
								<item.component
									slot={item.slot}
									key={item.key}
									options={item.options}
								/>
							</AdminExtensionBoundary>
						</div>
					);
				}}
			</For>
		</div>
	);
};
