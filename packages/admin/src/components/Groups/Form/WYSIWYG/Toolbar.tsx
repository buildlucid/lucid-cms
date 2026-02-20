import type { Editor } from "@tiptap/core";
import {
	FaSolidBold,
	FaSolidEraser,
	FaSolidItalic,
	FaSolidLink,
	FaSolidListOl,
	FaSolidListUl,
	FaSolidStrikethrough,
	FaSolidUnderline,
} from "solid-icons/fa";
import { type Component, createSignal } from "solid-js";
import { createEditorTransaction } from "solid-tiptap";
import T from "@/translations";
import LinkModal from "./LinkModal";
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
	const [linkModalOpen, setLinkModalOpen] = createSignal(false);
	const [linkModalLabel, setLinkModalLabel] = createSignal("");
	const [linkModalUrl, setLinkModalUrl] = createSignal("");
	const [linkModalOpenInNewTab, setLinkModalOpenInNewTab] = createSignal(false);
	const [selectionRange, setSelectionRange] = createSignal<{
		from: number;
		to: number;
	} | null>(null);

	// ----------------------------------------
	// Functions
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
	const closeLinkModal = (open: boolean) => setLinkModalOpen(open);
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

	// ----------------------------------------
	// Render
	return (
		<>
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
					<option value="0">{T()("wysiwyg_normal")}</option>
					<option value="1">{T()("wysiwyg_heading_1")}</option>
					<option value="2">{T()("wysiwyg_heading_2")}</option>
					<option value="3">{T()("wysiwyg_heading_3")}</option>
					<option value="4">{T()("wysiwyg_heading_4")}</option>
					<option value="5">{T()("wysiwyg_heading_5")}</option>
					<option value="6">{T()("wysiwyg_heading_6")}</option>
				</select>

				<div class="h-5 w-px bg-border" />

				<ToolbarButton
					isActive={isBold()}
					onClick={() => props.editor.chain().focus().toggleBold().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_bold")}
				>
					<FaSolidBold size={12} />
				</ToolbarButton>
				<ToolbarButton
					isActive={isItalic()}
					onClick={() => props.editor.chain().focus().toggleItalic().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_italic")}
				>
					<FaSolidItalic size={12} />
				</ToolbarButton>
				<ToolbarButton
					isActive={isUnderline()}
					onClick={() => props.editor.chain().focus().toggleUnderline().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_underline")}
				>
					<FaSolidUnderline size={12} />
				</ToolbarButton>
				<ToolbarButton
					isActive={isStrike()}
					onClick={() => props.editor.chain().focus().toggleStrike().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_strikethrough")}
				>
					<FaSolidStrikethrough size={12} />
				</ToolbarButton>

				<div class="h-5 w-px bg-border" />

				<ToolbarButton
					isActive={isOrderedList()}
					onClick={() => props.editor.chain().focus().toggleOrderedList().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_ordered_list")}
				>
					<FaSolidListOl size={12} />
				</ToolbarButton>
				<ToolbarButton
					isActive={isBulletList()}
					onClick={() => props.editor.chain().focus().toggleBulletList().run()}
					disabled={props.disabled}
					title={T()("wysiwyg_bullet_list")}
				>
					<FaSolidListUl size={12} />
				</ToolbarButton>

				<div class="h-5 w-px bg-border" />

				<ToolbarButton
					isActive={isLink()}
					onClick={openLinkModal}
					disabled={props.disabled}
					title={isLink() ? T()("wysiwyg_edit_link") : T()("wysiwyg_add_link")}
				>
					<FaSolidLink size={12} />
				</ToolbarButton>
				<div class="h-5 w-px bg-border" />

				<ToolbarButton
					isActive={false}
					onClick={() =>
						props.editor.chain().focus().clearNodes().unsetAllMarks().run()
					}
					disabled={props.disabled}
					title={T()("wysiwyg_clear_formatting")}
				>
					<FaSolidEraser size={12} />
				</ToolbarButton>
			</div>
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
