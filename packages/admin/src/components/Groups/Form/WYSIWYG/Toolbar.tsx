import type { Editor } from "@tiptap/core";
import {
	FaSolidBold,
	FaSolidEraser,
	FaSolidItalic,
	FaSolidLink,
	FaSolidLinkSlash,
	FaSolidListOl,
	FaSolidListUl,
	FaSolidStrikethrough,
	FaSolidUnderline,
} from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import { createEditorTransaction } from "solid-tiptap";
import ToolbarButton from "./ToolbarButton";

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

	// ----------------------------------------
	// Functions
	const toggleLink = () => {
		if (props.editor.isActive("link")) {
			props.editor.chain().focus().unsetLink().run();
			return;
		}
		const url = window.prompt("Enter URL:");
		if (url) {
			props.editor.chain().focus().setLink({ href: url }).run();
		}
	};

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
			<select
				class="h-7 rounded border border-border bg-input-base px-1.5 text-xs text-title focus:border-primary-base focus:outline-none transition-colors duration-150"
				value={String(activeHeading())}
				onChange={(e) => {
					const level = Number.parseInt(e.currentTarget.value, 10);
					if (level === 0) {
						props.editor.chain().focus().setParagraph().run();
					} else {
						props.editor
							.chain()
							.focus()
							.setHeading({
								level: level as 1 | 2 | 3 | 4 | 5 | 6,
							})
							.run();
					}
				}}
				disabled={props.disabled}
			>
				<option value="0">Normal</option>
				<option value="1">Heading 1</option>
				<option value="2">Heading 2</option>
				<option value="3">Heading 3</option>
				<option value="4">Heading 4</option>
				<option value="5">Heading 5</option>
				<option value="6">Heading 6</option>
			</select>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				isActive={isBold()}
				onClick={() => props.editor.chain().focus().toggleBold().run()}
				disabled={props.disabled}
				title="Bold"
			>
				<FaSolidBold size={12} />
			</ToolbarButton>
			<ToolbarButton
				isActive={isItalic()}
				onClick={() => props.editor.chain().focus().toggleItalic().run()}
				disabled={props.disabled}
				title="Italic"
			>
				<FaSolidItalic size={12} />
			</ToolbarButton>
			<ToolbarButton
				isActive={isUnderline()}
				onClick={() => props.editor.chain().focus().toggleUnderline().run()}
				disabled={props.disabled}
				title="Underline"
			>
				<FaSolidUnderline size={12} />
			</ToolbarButton>
			<ToolbarButton
				isActive={isStrike()}
				onClick={() => props.editor.chain().focus().toggleStrike().run()}
				disabled={props.disabled}
				title="Strikethrough"
			>
				<FaSolidStrikethrough size={12} />
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				isActive={isOrderedList()}
				onClick={() => props.editor.chain().focus().toggleOrderedList().run()}
				disabled={props.disabled}
				title="Ordered list"
			>
				<FaSolidListOl size={12} />
			</ToolbarButton>
			<ToolbarButton
				isActive={isBulletList()}
				onClick={() => props.editor.chain().focus().toggleBulletList().run()}
				disabled={props.disabled}
				title="Bullet list"
			>
				<FaSolidListUl size={12} />
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				isActive={isLink()}
				onClick={toggleLink}
				disabled={props.disabled}
				title={isLink() ? "Remove link" : "Add link"}
			>
				<Show when={isLink()} fallback={<FaSolidLink size={12} />}>
					<FaSolidLinkSlash size={12} />
				</Show>
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				isActive={false}
				onClick={() =>
					props.editor.chain().focus().clearNodes().unsetAllMarks().run()
				}
				disabled={props.disabled}
				title="Clear formatting"
			>
				<FaSolidEraser size={12} />
			</ToolbarButton>
		</div>
	);
};

export default Toolbar;
