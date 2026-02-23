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
import type { Component } from "solid-js";
import T from "@/translations";
import HeadingMenu, { type HeadingOption } from "./HeadingMenu";
import ToolbarButton from "./ToolbarButton";

const ToolbarControls: Component<{
	mode: "mobile" | "pill";
	disabled?: boolean;
	activeHeading: number;
	headingOptions: HeadingOption[];
	headingMenuOpen?: boolean;
	onHeadingOpenChange?: (open: boolean) => void;
	onSetHeading: (level: number) => void;
	isBold: boolean;
	isItalic: boolean;
	isUnderline: boolean;
	isStrike: boolean;
	isOrderedList: boolean;
	isBulletList: boolean;
	isLink: boolean;
	onToggleBold: () => void;
	onToggleItalic: () => void;
	onToggleUnderline: () => void;
	onToggleStrike: () => void;
	onToggleOrderedList: () => void;
	onToggleBulletList: () => void;
	onOpenLinkModal: () => void;
	onClearFormatting: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const toolbarButtonMode = () => (props.mode === "pill" ? "pill" : "default");

	// ----------------------------------------
	// Render
	return (
		<>
			<HeadingMenu
				mode={props.mode}
				disabled={props.disabled}
				activeHeading={props.activeHeading}
				options={props.headingOptions}
				open={props.headingMenuOpen}
				onOpenChange={props.onHeadingOpenChange}
				onSetHeading={props.onSetHeading}
			/>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isBold}
				onClick={props.onToggleBold}
				disabled={props.disabled}
				title={T()("rich_text_bold")}
			>
				<FaSolidBold size={12} />
			</ToolbarButton>
			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isItalic}
				onClick={props.onToggleItalic}
				disabled={props.disabled}
				title={T()("rich_text_italic")}
			>
				<FaSolidItalic size={12} />
			</ToolbarButton>
			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isUnderline}
				onClick={props.onToggleUnderline}
				disabled={props.disabled}
				title={T()("rich_text_underline")}
			>
				<FaSolidUnderline size={12} />
			</ToolbarButton>
			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isStrike}
				onClick={props.onToggleStrike}
				disabled={props.disabled}
				title={T()("rich_text_strikethrough")}
			>
				<FaSolidStrikethrough size={12} />
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isOrderedList}
				onClick={props.onToggleOrderedList}
				disabled={props.disabled}
				title={T()("rich_text_ordered_list")}
			>
				<FaSolidListOl size={12} />
			</ToolbarButton>
			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isBulletList}
				onClick={props.onToggleBulletList}
				disabled={props.disabled}
				title={T()("rich_text_bullet_list")}
			>
				<FaSolidListUl size={12} />
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={props.isLink}
				onClick={props.onOpenLinkModal}
				disabled={props.disabled}
				title={
					props.isLink ? T()("rich_text_edit_link") : T()("rich_text_add_link")
				}
			>
				<FaSolidLink size={12} />
			</ToolbarButton>

			<div class="h-5 w-px bg-border" />

			<ToolbarButton
				mode={toolbarButtonMode()}
				isActive={false}
				onClick={props.onClearFormatting}
				disabled={props.disabled}
				title={T()("rich_text_clear_formatting")}
			>
				<FaSolidEraser size={12} />
			</ToolbarButton>
		</>
	);
};

export default ToolbarControls;
