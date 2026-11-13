import {
	TbOutlineExternalLink,
	TbOutlinePointer,
	TbOutlineRotateClockwise2,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import { PreviewCanvas } from "@/components/DocumentPreview/parts/PreviewCanvas";
import { PreviewOverlay } from "@/components/DocumentPreview/parts/PreviewOverlay";
import type { PreviewPage } from "@/components/DocumentPreview/types";
import { createPreviewBridge } from "@/components/DocumentPreview/utils/preview-bridge";
import {
	type PreviewToolbarItem,
	usePreviewContext,
} from "@/hooks/useDocumentPreview/useDocumentPreview";
import { usePreviewSession } from "@/hooks/usePreviewSession/usePreviewSession";
import {
	getPreviewTargetKind,
	type PreviewEditing,
	type PreviewHover,
	type PreviewTarget,
} from "@/preview/protocol";
import themeStore from "@/store/themeStore/themeStore";
import T from "@/translations";
import { getPreviewRepeaters } from "@/utils/preview-editing";

export type PreviewFrameProps = {
	/**
	 * Gives the page handles either side to resize it, and adds the toolbar's width and zoom
	 * controls. Left out, the page fills the frame.
	 */
	resizable?: boolean;
};

/**
 * The document's live page, showing unsaved edits and edited on in edit mode, as the builder's
 * own preview does. Adds the toolbar's edit, refresh and open controls while it's shown, and makes
 * the page available through `useDocumentPreview().page`. Fills its parent.
 *
 * @example
 * ```tsx
 * import { PreviewFrame } from "@lucidcms/admin/components";
 * import type { SlotComponent } from "@lucidcms/admin/types";
 * import type canvas from "./config.js";
 *
 * //* a `document.preview` slot that puts a brick panel beside the live page
 * const Canvas: SlotComponent<typeof canvas> = () => {
 * 	// ----------------------------------------
 * 	// Render
 * 	return (
 * 		<div class="flex h-full">
 * 			<BrickPanel />
 * 			<div class="min-w-0 flex-1">
 * 				<PreviewFrame />
 * 			</div>
 * 		</div>
 * 	);
 * };
 * ```
 */
const PreviewFrame: Component<PreviewFrameProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const context = usePreviewContext();
	const { preview } = context;
	const { document, focus, structure, fieldEdit, agent } = preview;
	const [hover, setHover] = createSignal<PreviewHover | null>(null);
	//* whether a field is being typed into on the page
	const [typing, setTyping] = createSignal(false);
	//* a brick dragged on the page, while which the page zooms out
	const [pageDrag, setPageDrag] = createSignal(false);
	//* rises each time the page loads or shows new content
	const [revision, setRevision] = createSignal(0);
	//* markup reads asked for while the page is on its way, run again once it's settled
	let waitingReads: Array<() => void> = [];
	let unmounted = false;
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
		onPageChange: () => setRevision((count) => count + 1),
	});
	const unregisterScrollCapture = preview.scroll.register(bridge.captureScroll);
	const session = usePreviewSession({
		preview,
		open: context.open,
		bridge,
	});

	// ----------------------------------------
	// Memos
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
		const details = preview.details();
		if (!context.editMode() || documentId === undefined || !details) {
			return null;
		}
		return {
			collectionKey: document.collectionKey(),
			documentId,
			editable: preview.canEdit(),
			repeaters: getPreviewRepeaters(details),
			errors: preview.errors(),
			theme: themeStore.resolved(),
		};
	});
	//* a session being made, or its page loading in the frame
	const pageSettling = () =>
		session.state() === "idle" ||
		session.state() === "loading" ||
		session.frameLoading();
	//* unsaved documents and ones without a page have nothing to refresh or open
	const hasPage = () =>
		session.state() !== "unsaved" && session.state() !== "unavailable";

	// ----------------------------------------
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
	/** The page's markup, waiting for a session or page that's on its way. Null once there's none to read. */
	const readMarkup = (): Promise<string | null> => {
		if (unmounted) return Promise.resolve(null);
		if (pageSettling()) {
			return new Promise((resolve) => {
				waitingReads.push(() => void readMarkup().then(resolve));
			});
		}
		return session.state() === "ready"
			? bridge.captureMarkup()
			: Promise.resolve(null);
	};
	const runWaitingReads = () => {
		const waiting = waitingReads;
		waitingReads = [];
		for (const run of waiting) run();
	};
	const page: PreviewPage = {
		get state() {
			return session.state();
		},
		get url() {
			return session.url() ?? undefined;
		},
		get revision() {
			return revision();
		},
		refresh: session.refresh,
		openInTab: session.openInTab,
		html: readMarkup,
	};
	const pageItems: PreviewToolbarItem[] = [
		{
			key: "edit",
			render: () => (
				<Button
					type="button"
					variant="toolbar"
					size="xs"
					shape="square"
					tooltip={T()("preview.edit.label")}
					aria-label={T()("preview.edit.label")}
					aria-pressed={context.editMode()}
					class="aria-pressed:text-primary aria-pressed:hover:text-primary-hover"
					onClick={() => context.setEditMode(!context.editMode())}
				>
					<TbOutlinePointer size={12} />
				</Button>
			),
		},
		{
			key: "refresh",
			render: () => (
				<span class="hidden shrink-0 @2xl/preview-bar:flex">
					<Button
						type="button"
						variant="toolbar"
						size="xs"
						shape="square"
						tooltip={T()("common.refresh")}
						aria-label={T()("common.refresh")}
						disabled={!hasPage()}
						onClick={() => session.refresh()}
					>
						<TbOutlineRotateClockwise2 size={12} />
					</Button>
				</span>
			),
		},
		{
			key: "open",
			render: () => (
				<span class="hidden shrink-0 @2xl/preview-bar:flex">
					<Button
						type="button"
						variant="toolbar"
						size="xs"
						shape="square"
						tooltip={T()("preview.open")}
						aria-label={T()("preview.open")}
						loading={session.opening()}
						disabled={!hasPage()}
						onClick={() => session.openInTab()}
					>
						<TbOutlineExternalLink size={12} />
					</Button>
				</span>
			),
		},
	];

	// ----------------------------------------
	// Effects
	createEffect(() => bridge.setEditing(editing()));
	createEffect(() => {
		if (!pageSettling()) runWaitingReads();
	});
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

	// ----------------------------------------
	// Lifecycle
	context.showPage(page);
	context.addToolbarItems(pageItems);
	onCleanup(() => {
		unmounted = true;
		runWaitingReads();
		unregisterScrollCapture();
		bridge.cleanup();
	});

	// ----------------------------------------
	// Render
	return (
		<PreviewCanvas
			frameSrc={() => session.url() ?? undefined}
			pageState={session.state}
			frameLoading={session.frameLoading}
			setFrameLoading={session.setFrameLoading}
			setFrameRef={bridge.setFrame}
			breakpoints={document.breakpoints}
			resizable={props.resizable === true}
			zoomedOut={zoomedOut}
			onZoomingChange={bridge.setZooming}
			onRetry={session.retry}
			overlay={(viewport) => (
				<Show when={editing()}>
					<PreviewOverlay
						hover={hover()}
						scale={viewport.scale()}
						width={viewport.width()}
						editable={preview.canEdit()}
						canChangeStructure={preview.canChangeStructure()}
						details={preview.details()}
						errors={preview.errors()}
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
	);
};

export default PreviewFrame;
