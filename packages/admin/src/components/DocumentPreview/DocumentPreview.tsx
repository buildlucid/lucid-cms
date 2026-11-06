import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import type { BuilderPreview } from "@/hooks/useBuilderPreview/useBuilderPreview";
import { usePreviewSession } from "@/hooks/usePreviewSession/usePreviewSession";
import {
	getPreviewTargetKind,
	type PreviewEditing,
	type PreviewHover,
	type PreviewTarget,
} from "@/preview/protocol";
import themeStore from "@/store/themeStore/themeStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import { getPreviewRepeaters } from "@/utils/preview-editing";
import {
	PreviewCanvas,
	type PreviewWidthSelection,
	type PreviewZoom,
} from "./parts/PreviewCanvas";
import { PreviewOverlay } from "./parts/PreviewOverlay";
import { createPreviewBridge } from "./utils/preview-bridge";

/** The document's page beside its fields, which shows unsaved edits and can be edited on in edit mode. */
export const DocumentPreview: Component<{
	open: Accessor<boolean>;
	preview: BuilderPreview;
	/** Where the preview's controls render, in the page builder header above it. */
	toolbarMount?: Accessor<HTMLElement | undefined>;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { document, focus, structure, fieldEdit, agent } = props.preview;
	const [selectedWidth, setSelectedWidth] =
		createSignal<PreviewWidthSelection>("fit");
	const [customWidth, setCustomWidth] = createSignal(768);
	const [zoom, setZoom] = createSignal<PreviewZoom>("fit");
	const [hover, setHover] = createSignal<PreviewHover | null>(null);
	//* whether a field is being typed into on the page
	const [typing, setTyping] = createSignal(false);
	//* a brick dragged on the page, while which the page zooms out
	const [pageDrag, setPageDrag] = createSignal(false);
	const bridge = createPreviewBridge({
		onFocusField: (target) => void focus.requestTarget(target),
		onMove: (target, place, anchor) => {
			structure.handle(target, { action: "move", place, anchor });
		},
		onHover: setHover,
		onDeselect: focus.deselect,
		onReload: () => session.setFrameLoading(true),
		onNavigationLocked: (href) => void focus.explainLink(href),
		onEdit: (target, text) => editField(target, text),
		onInlineInput: fieldEdit.input,
		onInlineEnd: (target, cancelled) => {
			setTyping(false);
			fieldEdit.end(target, cancelled);
		},
	});
	const unregisterScrollCapture = props.preview.scroll.register(
		bridge.captureScroll,
	);
	const session = usePreviewSession({
		preview: props.preview,
		open: props.open,
		bridge,
	});

	// ----------------------------------
	// Memos
	const editMode = createMemo(
		() =>
			userPreferencesStore.getCollectionPreviewEditing(
				document.collectionKey(),
			) ?? true,
	);
	//* bricks zoom the page out while they're dragged, to show more of where they can go; repeater items stay close
	const zoomedOut = () => {
		const dragged = structure.dragged();
		return (
			pageDrag() ||
			(dragged !== null && getPreviewTargetKind(dragged.target) === "brick")
		);
	};
	const editing = createMemo((): PreviewEditing | null => {
		const documentId = document.documentId();
		const details = props.preview.details();
		if (!editMode() || documentId === undefined || !details) return null;
		return {
			collectionKey: document.collectionKey(),
			documentId,
			editable: props.preview.canEdit(),
			repeaters: getPreviewRepeaters(details),
			errors: props.preview.errors(),
			theme: themeStore.resolved(),
		};
	});

	// ----------------------------------
	// Functions
	/** Edits a field the page asked to: typed into there, or opened in the builder's fields with its picker or cursor. */
	const editField = (target: PreviewTarget, text: string | null) => {
		const edit = fieldEdit.request(target, text);
		switch (edit.mode) {
			case "inline": {
				const started = bridge.startInline(target, {
					multiline: edit.multiline,
					clear: edit.clear,
				});
				if (started) setTyping(true);
				else fieldEdit.end(target, true);
				return;
			}
			case "builder":
				void focus.requestTarget(target, { activate: true });
				return;
			case "none":
				return;
		}
	};

	// ----------------------------------
	// Effects
	createEffect(() => bridge.setEditing(editing()));
	//* the page shows the brick or item as being moved, then points it out where it was dropped
	createEffect(
		on(
			structure.dragged,
			(drag, previous) => {
				bridge.setDragged(drag);
				if (!drag && previous) bridge.highlight(previous.target);
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			focus.builderTarget,
			(target) => {
				if (target) bridge.highlight(target);
			},
			{ defer: true },
		),
	);

	// ----------------------------------
	// Lifecycle
	onCleanup(() => {
		unregisterScrollCapture();
		bridge.cleanup();
	});

	// ----------------------------------
	// Render
	return (
		<section class="h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
			<PreviewCanvas
				frameSrc={() => session.url() ?? undefined}
				resolverState={session.state}
				frameLoading={session.frameLoading}
				setFrameLoading={session.setFrameLoading}
				setFrameRef={bridge.setFrame}
				breakpoints={document.breakpoints}
				selectedWidth={selectedWidth}
				setSelectedWidth={setSelectedWidth}
				customWidth={customWidth}
				setCustomWidth={setCustomWidth}
				zoom={zoom}
				setZoom={setZoom}
				zoomedOut={zoomedOut}
				onZoomingChange={bridge.setZooming}
				editMode={editMode}
				onToggleEditMode={() =>
					userPreferencesStore.setCollectionPreviewEditing(
						document.collectionKey(),
						!editMode(),
					)
				}
				actionLoading={session.opening}
				onRefresh={session.refresh}
				onOpen={session.openInTab}
				onRetry={session.retry}
				toolbarMount={props.toolbarMount}
				overlay={(viewport) => (
					<Show when={editing()}>
						<PreviewOverlay
							hover={hover()}
							scale={viewport.scale()}
							width={viewport.width()}
							editable={props.preview.canEdit()}
							canChangeStructure={props.preview.canChangeStructure()}
							details={props.preview.details()}
							errors={props.preview.errors()}
							capacity={structure.capacity}
							onOpen={(target) => {
								void focus.requestTarget(target);
								bridge.highlight(target);
							}}
							onEditField={bridge.editSelected}
							onAsk={agent.available() ? agent.ask : undefined}
							typing={typing()}
							onChange={structure.handle}
							onUndo={structure.undo}
							onDrag={(target, point) => {
								if (getPreviewTargetKind(target) === "brick") setPageDrag(true);
								bridge.drag(target, point);
							}}
							onDragEnd={(drop) => {
								setPageDrag(false);
								bridge.endDrag(drop);
							}}
						/>
					</Show>
				)}
			/>
		</section>
	);
};
