import { type Accessor, type Component, createMemo, Show } from "solid-js";
import { Portal } from "solid-js/web";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import PreviewFrame from "@/components/PreviewFrame/PreviewFrame";
import type { BuilderPreview } from "@/hooks/useBuilderPreview/useBuilderPreview";
import { DocumentPreviewProvider } from "@/hooks/useDocumentPreview/useDocumentPreview";
import { PreviewToolbar } from "./parts/PreviewToolbar";
import { findPreviewReplacement } from "./utils/find-preview-replacement";

/**
 * Shows the resizable live preview or its `document.preview` replacement, with a shared header
 * toolbar.
 */
export const DocumentPreview: Component<{
	open: Accessor<boolean>;
	preview: BuilderPreview;
	/** Where the preview's controls render, in the page builder header above it. */
	toolbarMount?: Accessor<HTMLElement | undefined>;
}> = (props) => {
	// ----------------------------------
	// Memos
	const replacement = createMemo(() =>
		findPreviewReplacement(props.preview.document.collectionKey()),
	);

	// ----------------------------------
	// Render
	return (
		<DocumentPreviewProvider preview={props.preview} open={props.open}>
			<section class="h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
				<Show when={replacement()} keyed fallback={<PreviewFrame resizable />}>
					{(entry) => (
						<div data-admin-slot={entry.key} class="h-full min-h-0">
							<AdminExtensionBoundary name={entry.key} placement="content">
								<entry.component
									slot={entry.slot}
									key={entry.key}
									options={entry.options}
								/>
							</AdminExtensionBoundary>
						</div>
					)}
				</Show>
			</section>
			<Show when={props.toolbarMount?.()} keyed>
				{(mount) => (
					<Portal
						mount={mount}
						ref={(element) => element.classList.add("contents")}
					>
						<PreviewToolbar />
					</Portal>
				)}
			</Show>
		</DocumentPreviewProvider>
	);
};
