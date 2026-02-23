import type { Editor } from "@tiptap/core";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { createEditorTransaction } from "solid-tiptap";
import T from "@/translations";
import type { HeadingOption } from "./HeadingMenu";
import LinkModal from "./LinkModal";
import ToolbarControls from "./ToolbarControls";

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const PILL_OFFSET = 10;
const VIEWPORT_PADDING = 8;

type SelectionRect = {
	top: number;
	left: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

const Toolbar: Component<{
	editor: Editor;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const isBold = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("bold"),
	);
	const isItalic = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("italic"),
	);
	const isUnderline = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("underline"),
	);
	const isStrike = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("strike"),
	);
	const isBulletList = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("bulletList"),
	);
	const isOrderedList = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("orderedList"),
	);
	const isLink = createEditorTransaction(
		() => props.editor,
		(e) => e.isActive("link"),
	);
	const activeHeading = createEditorTransaction(
		() => props.editor,
		(e) => {
			for (let i = 1; i <= 6; i++) {
				if (e.isActive("heading", { level: i })) return i;
			}
			return 0;
		},
	);
	const selectionState = createEditorTransaction(
		() => props.editor,
		(e) => ({
			from: e.state.selection.from,
			to: e.state.selection.to,
			empty: e.state.selection.empty,
		}),
	);
	const [isDesktop, setIsDesktop] = createSignal(false);
	const [pillVisible, setPillVisible] = createSignal(false);
	const [pillPosition, setPillPosition] = createSignal({
		top: -9999,
		left: -9999,
	});
	const [headingMenuOpen, setHeadingMenuOpen] = createSignal(false);
	const [linkModalOpen, setLinkModalOpen] = createSignal(false);
	const [linkModalLabel, setLinkModalLabel] = createSignal("");
	const [linkModalUrl, setLinkModalUrl] = createSignal("");
	const [linkModalOpenInNewTab, setLinkModalOpenInNewTab] = createSignal(false);
	const [lastSelectionRect, setLastSelectionRect] =
		createSignal<SelectionRect | null>(null);
	const [selectionRange, setSelectionRange] = createSignal<{
		from: number;
		to: number;
	} | null>(null);
	const headingOptions = createMemo<HeadingOption[]>(() => [
		{ value: 0, label: T()("rich_text_normal") },
		{ value: 1, label: T()("rich_text_heading_1") },
		{ value: 2, label: T()("rich_text_heading_2") },
		{ value: 3, label: T()("rich_text_heading_3") },
		{ value: 4, label: T()("rich_text_heading_4") },
		{ value: 5, label: T()("rich_text_heading_5") },
		{ value: 6, label: T()("rich_text_heading_6") },
	]);

	let pillRef: HTMLDivElement | undefined;
	let rafId: number | undefined;

	// ----------------------------------------
	// Functions
	const closeLinkModal = (open: boolean) => setLinkModalOpen(open);
	const schedulePillUpdate = () => {
		if (typeof window === "undefined") return;
		if (rafId !== undefined) window.cancelAnimationFrame(rafId);
		rafId = window.requestAnimationFrame(() => {
			rafId = undefined;
			updatePillPosition();
		});
	};
	const hidePill = () => {
		setPillVisible(false);
	};
	const getSelectionRect = () => {
		if (typeof window === "undefined") return null;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
			return null;

		const range = selection.getRangeAt(0);
		const root = props.editor.view.dom;
		const ancestorNode = range.commonAncestorContainer;
		const ancestorElement =
			ancestorNode.nodeType === Node.ELEMENT_NODE
				? (ancestorNode as Element)
				: ancestorNode.parentElement;
		if (!ancestorElement || !root.contains(ancestorElement)) return null;

		const rect = range.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return null;

		return {
			top: rect.top,
			left: rect.left,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height,
		} satisfies SelectionRect;
	};
	const updatePillPosition = () => {
		if (typeof window === "undefined") return;
		if (props.disabled || !isDesktop() || linkModalOpen()) {
			hidePill();
			return;
		}
		const keepPillOpenForHeadingMenu = headingMenuOpen();
		if (
			(!props.editor.isFocused || props.editor.state.selection.empty) &&
			!keepPillOpenForHeadingMenu
		) {
			hidePill();
			return;
		}

		const liveSelectionRect = getSelectionRect();
		if (liveSelectionRect) {
			setLastSelectionRect(liveSelectionRect);
		}
		const selectionRect =
			liveSelectionRect ??
			(keepPillOpenForHeadingMenu ? lastSelectionRect() : null);
		if (!selectionRect) {
			hidePill();
			return;
		}

		const pillElement = pillRef;
		if (!pillElement) return;
		const pillRect = pillElement.getBoundingClientRect();
		if (pillRect.width === 0 || pillRect.height === 0) return;

		let left =
			selectionRect.left + selectionRect.width / 2 - pillRect.width / 2;
		left = Math.min(
			Math.max(left, VIEWPORT_PADDING),
			window.innerWidth - pillRect.width - VIEWPORT_PADDING,
		);

		const shouldRenderAbove =
			selectionRect.top >= pillRect.height + PILL_OFFSET + VIEWPORT_PADDING;
		let top = shouldRenderAbove
			? selectionRect.top - pillRect.height - PILL_OFFSET
			: selectionRect.bottom + PILL_OFFSET;
		top = Math.min(
			Math.max(top, VIEWPORT_PADDING),
			window.innerHeight - pillRect.height - VIEWPORT_PADDING,
		);

		setPillPosition({ top, left });
		setPillVisible(true);
	};
	const setHeading = (level: number) => {
		if (level === 0) {
			props.editor.chain().focus().setParagraph().run();
			return;
		}
		props.editor
			.chain()
			.focus()
			.setHeading({
				level: level as 1 | 2 | 3 | 4 | 5 | 6,
			})
			.run();
	};
	const openLinkModal = () => {
		if (props.editor.isActive("link")) {
			props.editor.chain().focus().extendMarkRange("link").run();
		}
		const currentSelection = props.editor.state.selection;
		const attrs = props.editor.getAttributes("link") as {
			href?: string;
			target?: string | null;
		};
		const selectedText = props.editor.state.doc.textBetween(
			currentSelection.from,
			currentSelection.to,
			" ",
		);
		setSelectionRange({
			from: currentSelection.from,
			to: currentSelection.to,
		});
		setLinkModalLabel(selectedText);
		setLinkModalUrl(attrs.href ?? "");
		setLinkModalOpenInNewTab(attrs.target === "_blank");
		setLinkModalOpen(true);
	};
	const updateLink = (values: {
		label: string;
		url: string;
		openInNewTab: boolean;
	}) => {
		setLinkModalOpen(false);

		requestAnimationFrame(() => {
			let chain = props.editor.chain();
			const capturedSelection = selectionRange();
			if (capturedSelection) {
				chain = chain.setTextSelection(capturedSelection);
			}

			chain = chain.focus().extendMarkRange("link");
			const url = values.url.trim();
			if (!url) {
				chain.unsetLink().run();
				return;
			}

			const label = values.label.trim();
			const linkAttrs = {
				href: url,
				target: values.openInNewTab ? "_blank" : null,
			};

			if (label) {
				chain
					.insertContent({
						type: "text",
						text: label,
						marks: [
							{
								type: "link",
								attrs: linkAttrs,
							},
						],
					})
					.run();
				return;
			}

			chain.setLink(linkAttrs).run();
		});
	};
	const handleHeadingMenuOpenChange = (open: boolean) => {
		setHeadingMenuOpen(open);
		schedulePillUpdate();
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (typeof window === "undefined") return;

		const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
		const syncDesktopState = () => setIsDesktop(mediaQuery.matches);
		syncDesktopState();

		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", syncDesktopState);
			onCleanup(() =>
				mediaQuery.removeEventListener("change", syncDesktopState),
			);
			return;
		}

		mediaQuery.addListener(syncDesktopState);
		onCleanup(() => mediaQuery.removeListener(syncDesktopState));
	});
	createEffect(() => {
		if (!isDesktop()) {
			hidePill();
			return;
		}
		const onViewportChange = () => schedulePillUpdate();
		const onScroll = () => {
			hidePill();
			setHeadingMenuOpen(false);
		};
		const editorDom = props.editor.view.dom;

		document.addEventListener("selectionchange", onViewportChange);
		window.addEventListener("resize", onViewportChange);
		window.addEventListener("scroll", onScroll, true);
		editorDom.addEventListener("mouseup", onViewportChange);
		editorDom.addEventListener("keyup", onViewportChange);
		editorDom.addEventListener("focusin", onViewportChange);
		editorDom.addEventListener("focusout", onViewportChange);

		schedulePillUpdate();

		onCleanup(() => {
			document.removeEventListener("selectionchange", onViewportChange);
			window.removeEventListener("resize", onViewportChange);
			window.removeEventListener("scroll", onScroll, true);
			editorDom.removeEventListener("mouseup", onViewportChange);
			editorDom.removeEventListener("keyup", onViewportChange);
			editorDom.removeEventListener("focusin", onViewportChange);
			editorDom.removeEventListener("focusout", onViewportChange);
		});
	});
	createEffect(() => {
		selectionState();
		activeHeading();
		isBold();
		isItalic();
		isUnderline();
		isStrike();
		isBulletList();
		isOrderedList();
		isLink();
		schedulePillUpdate();
	});
	createEffect(() => {
		if (linkModalOpen()) {
			hidePill();
			return;
		}
		schedulePillUpdate();
	});
	createEffect(() => {
		if (props.disabled) {
			hidePill();
		}
	});

	// ----------------------------------------
	// Cleanup
	onCleanup(() => {
		if (rafId !== undefined && typeof window !== "undefined") {
			window.cancelAnimationFrame(rafId);
		}
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<div class="md:hidden flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
				<ToolbarControls
					mode="mobile"
					disabled={props.disabled}
					activeHeading={activeHeading()}
					headingOptions={headingOptions()}
					onSetHeading={setHeading}
					isBold={isBold()}
					isItalic={isItalic()}
					isUnderline={isUnderline()}
					isStrike={isStrike()}
					isOrderedList={isOrderedList()}
					isBulletList={isBulletList()}
					isLink={isLink()}
					onToggleBold={() => props.editor.chain().focus().toggleBold().run()}
					onToggleItalic={() =>
						props.editor.chain().focus().toggleItalic().run()
					}
					onToggleUnderline={() =>
						props.editor.chain().focus().toggleUnderline().run()
					}
					onToggleStrike={() =>
						props.editor.chain().focus().toggleStrike().run()
					}
					onToggleOrderedList={() =>
						props.editor.chain().focus().toggleOrderedList().run()
					}
					onToggleBulletList={() =>
						props.editor.chain().focus().toggleBulletList().run()
					}
					onOpenLinkModal={openLinkModal}
					onClearFormatting={() =>
						props.editor.chain().focus().clearNodes().unsetAllMarks().run()
					}
				/>
			</div>

			<Show when={isDesktop()}>
				<Portal>
					<div
						ref={pillRef}
						class={classNames(
							"fixed z-60 flex items-center gap-1 rounded-xl border border-border bg-card-base px-1.5 py-1 shadow-md backdrop-blur-sm transition-opacity duration-150",
							{
								"opacity-100 pointer-events-auto": pillVisible(),
								"opacity-0 pointer-events-none": !pillVisible(),
							},
						)}
						style={{
							top: `${pillPosition().top}px`,
							left: `${pillPosition().left}px`,
						}}
					>
						<ToolbarControls
							mode="pill"
							disabled={props.disabled}
							activeHeading={activeHeading()}
							headingOptions={headingOptions()}
							headingMenuOpen={headingMenuOpen()}
							onHeadingOpenChange={handleHeadingMenuOpenChange}
							onSetHeading={setHeading}
							isBold={isBold()}
							isItalic={isItalic()}
							isUnderline={isUnderline()}
							isStrike={isStrike()}
							isOrderedList={isOrderedList()}
							isBulletList={isBulletList()}
							isLink={isLink()}
							onToggleBold={() =>
								props.editor.chain().focus().toggleBold().run()
							}
							onToggleItalic={() =>
								props.editor.chain().focus().toggleItalic().run()
							}
							onToggleUnderline={() =>
								props.editor.chain().focus().toggleUnderline().run()
							}
							onToggleStrike={() =>
								props.editor.chain().focus().toggleStrike().run()
							}
							onToggleOrderedList={() =>
								props.editor.chain().focus().toggleOrderedList().run()
							}
							onToggleBulletList={() =>
								props.editor.chain().focus().toggleBulletList().run()
							}
							onOpenLinkModal={openLinkModal}
							onClearFormatting={() =>
								props.editor.chain().focus().clearNodes().unsetAllMarks().run()
							}
						/>
					</div>
				</Portal>
			</Show>

			<LinkModal
				state={{
					open: linkModalOpen(),
					setOpen: closeLinkModal,
					initialLabel: linkModalLabel(),
					initialUrl: linkModalUrl(),
					initialOpenInNewTab: linkModalOpenInNewTab(),
				}}
				callbacks={{
					onUpdate: updateLink,
				}}
			/>
		</>
	);
};

export default Toolbar;
