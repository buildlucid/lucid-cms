import type { Editor } from "@tiptap/core";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import { createEditorTransaction } from "solid-tiptap";
import T from "@/translations";
import { hasRichTextInsertControls } from "../helpers";
import { getRichTextToolbarFeatures } from "../toolbar-features";
import type { RichTextOptions } from "../types";
import useLinkModal from "../useLinkModal";
import type { HeadingOption } from "./HeadingMenu";
import InsertControls from "./InsertControls";
import LinkModal from "./LinkModal";
import SelectionPill from "./SelectionPill";
import ToolbarControls from "./ToolbarControls";

const Toolbar: Component<{
	editor: Editor;
	disabled?: boolean;
	options?: RichTextOptions;
	fullscreen: boolean;
	onFullscreenChange: (fullscreen: boolean) => void;
	/** Rendered at the end of the toolbar row, after the built in controls. */
	end?: JSXElement;
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
	const [headingMenuOpen, setHeadingMenuOpen] = createSignal(false);
	const link = useLinkModal({
		editor: () => props.editor,
		options: () => props.options,
	});

	// ----------------------------------------
	// Memos
	const headingOptions = createMemo<HeadingOption[]>(() => [
		{ value: 0, label: T()("editor.rich.text.blocks.normal") },
		{ value: 1, label: T()("editor.rich.text.headings.1") },
		{ value: 2, label: T()("editor.rich.text.headings.2") },
		{ value: 3, label: T()("editor.rich.text.headings.3") },
		{ value: 4, label: T()("editor.rich.text.headings.4") },
		{ value: 5, label: T()("editor.rich.text.headings.5") },
		{ value: 6, label: T()("editor.rich.text.headings.6") },
	]);

	const hasControls = createMemo(
		() => getRichTextToolbarFeatures(props.options).size > 0,
	);
	const hasInsertControls = createMemo(() =>
		hasRichTextInsertControls(props.options),
	);

	// ----------------------------------------
	// Functions
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

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={hasControls() || hasInsertControls() || props.end}>
				<div
					class={classNames(
						"flex flex-wrap items-center gap-1.5 border-b border-border py-1.5",
						{
							"px-2": props.options?.appearance !== "seamless",
						},
					)}
				>
					<ToolbarControls
						mode="toolbar"
						disabled={props.disabled}
						options={props.options}
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
						onOpenLinkModal={link.open}
						onClearFormatting={() =>
							props.editor.chain().focus().clearNodes().unsetAllMarks().run()
						}
					/>
					<InsertControls
						editor={props.editor}
						disabled={props.disabled}
						options={props.options}
						fullscreen={props.fullscreen}
						onFullscreenChange={props.onFullscreenChange}
					/>
					<Show when={props.end}>{props.end}</Show>
				</div>
			</Show>

			<Show when={hasControls()}>
				<SelectionPill
					editor={props.editor}
					hidden={props.disabled || link.isOpen()}
					keepOpen={headingMenuOpen()}
					onDismiss={() => setHeadingMenuOpen(false)}
				>
					<ToolbarControls
						mode="pill"
						disabled={props.disabled}
						options={props.options}
						activeHeading={activeHeading()}
						headingOptions={headingOptions()}
						headingMenuOpen={headingMenuOpen()}
						onHeadingOpenChange={setHeadingMenuOpen}
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
						onOpenLinkModal={link.open}
						onClearFormatting={() =>
							props.editor.chain().focus().clearNodes().unsetAllMarks().run()
						}
					/>
				</SelectionPill>
			</Show>

			<LinkModal
				state={link.state()}
				options={props.options}
				callbacks={link.callbacks}
			/>
		</>
	);
};

export default Toolbar;
