import type { Editor } from "@tiptap/core";
import {
	FaSolidBold,
	FaSolidCode,
	FaSolidEraser,
	FaSolidItalic,
	FaSolidLink,
	FaSolidListOl,
	FaSolidListUl,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal } from "solid-js";
import { createEditorTransaction } from "solid-tiptap";
import HeadingMenu, {
	type HeadingOption,
} from "@/components/RichText/parts/HeadingMenu";
import LinkModal from "@/components/RichText/parts/LinkModal";
import SelectionPill from "@/components/RichText/parts/SelectionPill";
import ToolbarButton from "@/components/RichText/parts/ToolbarButton";
import useLinkModal from "@/components/RichText/useLinkModal";
import T from "@/translations";

//* matches the heading levels in `agentMarkdownExtensions`
const HEADING_LEVELS = [1, 2, 3, 4] as const;

/**
 * The selection pill for the agent's Markdown editors: the chat box and routine
 * instructions. It keeps to a few controls, as other formatting has Markdown
 * shortcuts such as `> ` and `~~`.
 */
const AgentMarkdownPill: Component<{
	editor: Editor;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const active = createEditorTransaction(
		() => props.editor,
		(editor) => ({
			bold: editor.isActive("bold"),
			italic: editor.isActive("italic"),
			code: editor.isActive("code"),
			bulletList: editor.isActive("bulletList"),
			orderedList: editor.isActive("orderedList"),
			link: editor.isActive("link"),
			heading:
				HEADING_LEVELS.find((level) => editor.isActive("heading", { level })) ??
				0,
		}),
	);
	const [headingMenuOpen, setHeadingMenuOpen] = createSignal(false);
	const link = useLinkModal({ editor: () => props.editor });

	// ----------------------------------------
	// Memos
	const headingOptions = createMemo<HeadingOption[]>(() => [
		{ value: 0, label: T()("editor.rich.text.blocks.normal") },
		...HEADING_LEVELS.map((level) => ({
			value: level,
			label: T()(`editor.rich.text.headings.${level}`),
		})),
	]);

	// ----------------------------------------
	// Functions
	const chain = () => props.editor.chain().focus();
	const setHeading = (value: number) => {
		const level = HEADING_LEVELS.find((option) => option === value);
		if (level === undefined) {
			chain().setParagraph().run();
			return;
		}
		chain().setHeading({ level }).run();
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<SelectionPill
				editor={props.editor}
				hidden={link.isOpen()}
				keepOpen={headingMenuOpen()}
				onDismiss={() => setHeadingMenuOpen(false)}
			>
				<HeadingMenu
					mode="pill"
					activeHeading={active().heading}
					options={headingOptions()}
					open={headingMenuOpen()}
					onOpenChange={setHeadingMenuOpen}
					onSetHeading={setHeading}
				/>
				<div class="h-5 w-px bg-border" />
				<ToolbarButton
					mode="pill"
					isActive={active().bold}
					onClick={() => chain().toggleBold().run()}
					title={T()("editor.rich.text.marks.bold")}
				>
					<FaSolidBold size={12} />
				</ToolbarButton>
				<ToolbarButton
					mode="pill"
					isActive={active().italic}
					onClick={() => chain().toggleItalic().run()}
					title={T()("editor.rich.text.marks.italic")}
				>
					<FaSolidItalic size={12} />
				</ToolbarButton>
				<ToolbarButton
					mode="pill"
					isActive={active().code}
					onClick={() => chain().toggleCode().run()}
					title={T()("editor.rich.text.marks.code")}
				>
					<FaSolidCode size={12} />
				</ToolbarButton>
				<div class="h-5 w-px bg-border" />
				<ToolbarButton
					mode="pill"
					isActive={active().bulletList}
					onClick={() => chain().toggleBulletList().run()}
					title={T()("editor.rich.text.lists.bullet")}
				>
					<FaSolidListUl size={12} />
				</ToolbarButton>
				<ToolbarButton
					mode="pill"
					isActive={active().orderedList}
					onClick={() => chain().toggleOrderedList().run()}
					title={T()("editor.rich.text.lists.ordered")}
				>
					<FaSolidListOl size={12} />
				</ToolbarButton>
				<div class="h-5 w-px bg-border" />
				<ToolbarButton
					mode="pill"
					isActive={active().link}
					onClick={link.open}
					title={
						active().link
							? T()("editor.rich.text.link.edit")
							: T()("editor.rich.text.link.add")
					}
				>
					<FaSolidLink size={12} />
				</ToolbarButton>
				<div class="h-5 w-px bg-border" />
				<ToolbarButton
					mode="pill"
					isActive={false}
					onClick={() => chain().clearNodes().unsetAllMarks().run()}
					title={T()("editor.rich.text.formatting.clear")}
				>
					<FaSolidEraser size={12} />
				</ToolbarButton>
			</SelectionPill>
			<LinkModal
				state={link.state()}
				newTab={false}
				callbacks={link.callbacks}
			/>
		</>
	);
};

export default AgentMarkdownPill;
