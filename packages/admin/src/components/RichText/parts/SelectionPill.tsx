import type { Editor } from "@tiptap/core";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createSignal,
	type JSXElement,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { getPillPosition } from "../utils/pill-position";

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

/**
 * Floats formatting controls beside the editor's text selection on desktop.
 * The rich text toolbar and the agent Markdown editors both use it.
 */
const SelectionPill: Component<{
	editor: Editor;
	/** Hides the pill, such as while a modal edits the selection. */
	hidden?: boolean;
	/** Keeps the pill at the last selection while one of its menus has focus. */
	keepOpen?: boolean;
	/** Scrolling hides the pill, so its open menus can close too. */
	onDismiss?: () => void;
	children: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [isDesktop, setIsDesktop] = createSignal(false);
	const [visible, setVisible] = createSignal(false);
	const [position, setPosition] = createSignal({ top: -9999, left: -9999 });
	let pillRef: HTMLDivElement | undefined;
	let lastSelectionRect: DOMRect | undefined;
	let rafId: number | undefined;

	// ----------------------------------------
	// Functions
	const getSelectionRect = () => {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			return undefined;
		}

		const range = selection.getRangeAt(0);
		const ancestor = range.commonAncestorContainer;
		const element =
			ancestor instanceof Element ? ancestor : ancestor.parentElement;
		if (!element || !props.editor.view.dom.contains(element)) return undefined;

		const rect = range.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return undefined;
		return rect;
	};
	const updatePosition = () => {
		const keepOpen = props.keepOpen === true;
		const { editor } = props;
		if (
			props.hidden ||
			!isDesktop() ||
			!editor.isEditable ||
			((!editor.isFocused || editor.state.selection.empty) && !keepOpen)
		) {
			setVisible(false);
			return;
		}

		const liveRect = getSelectionRect();
		if (liveRect) lastSelectionRect = liveRect;
		const selectionRect =
			liveRect ?? (keepOpen ? lastSelectionRect : undefined);
		if (!selectionRect) {
			setVisible(false);
			return;
		}

		const pillRect = pillRef?.getBoundingClientRect();
		if (!pillRect || pillRect.width === 0 || pillRect.height === 0) return;

		setPosition(
			getPillPosition(selectionRect, pillRect, {
				width: window.innerWidth,
				height: window.innerHeight,
			}),
		);
		setVisible(true);
	};
	//* batched to a frame, as selection, focus and transaction events arrive together
	const scheduleUpdate = () => {
		if (rafId !== undefined) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			rafId = undefined;
			updatePosition();
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
		const sync = () => setIsDesktop(mediaQuery.matches);
		sync();
		mediaQuery.addEventListener("change", sync);
		onCleanup(() => mediaQuery.removeEventListener("change", sync));
	});
	createEffect(() => {
		if (!isDesktop()) {
			setVisible(false);
			return;
		}
		const editor = props.editor;
		const dom = editor.view.dom;
		const onScroll = () => {
			setVisible(false);
			props.onDismiss?.();
		};

		document.addEventListener("selectionchange", scheduleUpdate);
		window.addEventListener("resize", scheduleUpdate);
		window.addEventListener("scroll", onScroll, true);
		dom.addEventListener("mouseup", scheduleUpdate);
		dom.addEventListener("keyup", scheduleUpdate);
		dom.addEventListener("focusin", scheduleUpdate);
		dom.addEventListener("focusout", scheduleUpdate);
		//* formatting changes the pill's width, so it is centred again
		editor.on("transaction", scheduleUpdate);
		scheduleUpdate();

		onCleanup(() => {
			document.removeEventListener("selectionchange", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
			window.removeEventListener("scroll", onScroll, true);
			dom.removeEventListener("mouseup", scheduleUpdate);
			dom.removeEventListener("keyup", scheduleUpdate);
			dom.removeEventListener("focusin", scheduleUpdate);
			dom.removeEventListener("focusout", scheduleUpdate);
			editor.off("transaction", scheduleUpdate);
		});
	});
	createEffect(
		on(() => [props.hidden, props.keepOpen], scheduleUpdate, { defer: true }),
	);
	onCleanup(() => {
		if (rafId !== undefined) cancelAnimationFrame(rafId);
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={isDesktop()}>
			<Portal>
				<div
					data-kb-top-layer
					ref={pillRef}
					class={classNames(
						"fixed z-60 flex items-center gap-1 rounded-xl border border-border bg-card px-1.5 py-1 shadow-md backdrop-blur-sm transition-opacity duration-150",
						{
							"opacity-100 pointer-events-auto": visible(),
							"opacity-0 pointer-events-none": !visible(),
						},
					)}
					style={{
						top: `${position().top}px`,
						left: `${position().left}px`,
					}}
				>
					{props.children}
				</div>
			</Portal>
		</Show>
	);
};

export default SelectionPill;
