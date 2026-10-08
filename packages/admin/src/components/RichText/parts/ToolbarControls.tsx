import {
	TbOutlineBold,
	TbOutlineEraser,
	TbOutlineItalic,
	TbOutlineLink,
	TbOutlineList,
	TbOutlineListNumbers,
	TbOutlineStrikethrough,
	TbOutlineUnderline,
} from "solid-icons/tb";
import { type Component, For, type JSXElement, Show } from "solid-js";
import T from "@/translations";
import { getRichTextToolbarFeatures } from "../toolbar-features";
import type { RichTextOptions } from "../types";
import HeadingMenu, { type HeadingOption } from "./HeadingMenu";
import ToolbarButton from "./ToolbarButton";

const ToolbarControls: Component<{
	mode: "toolbar" | "pill";
	disabled?: boolean;
	options?: RichTextOptions;
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
	const features = () => getRichTextToolbarFeatures(props.options);

	/**
	 * Controls are grouped so a divider is only drawn between groups that
	 * survived, rather than leaving a stray rule where a control used to be.
	 */
	const groups = (): JSXElement[][] => {
		const enabled = features();
		const all: Array<[boolean, JSXElement][]> = [
			[
				[
					enabled.has("headings"),
					<HeadingMenu
						mode={props.mode}
						disabled={props.disabled}
						activeHeading={props.activeHeading}
						options={props.headingOptions}
						open={props.headingMenuOpen}
						onOpenChange={props.onHeadingOpenChange}
						onSetHeading={props.onSetHeading}
					/>,
				],
			],
			[
				[
					enabled.has("bold"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isBold}
						onClick={props.onToggleBold}
						disabled={props.disabled}
						title={T()("editor.rich.text.marks.bold")}
					>
						<TbOutlineBold size={12} />
					</ToolbarButton>,
				],
				[
					enabled.has("italic"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isItalic}
						onClick={props.onToggleItalic}
						disabled={props.disabled}
						title={T()("editor.rich.text.marks.italic")}
					>
						<TbOutlineItalic size={12} />
					</ToolbarButton>,
				],
				[
					enabled.has("underline"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isUnderline}
						onClick={props.onToggleUnderline}
						disabled={props.disabled}
						title={T()("editor.rich.text.marks.underline")}
					>
						<TbOutlineUnderline size={12} />
					</ToolbarButton>,
				],
				[
					enabled.has("strikethrough"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isStrike}
						onClick={props.onToggleStrike}
						disabled={props.disabled}
						title={T()("editor.rich.text.marks.strikethrough")}
					>
						<TbOutlineStrikethrough size={12} />
					</ToolbarButton>,
				],
			],
			[
				[
					enabled.has("orderedList"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isOrderedList}
						onClick={props.onToggleOrderedList}
						disabled={props.disabled}
						title={T()("editor.rich.text.lists.ordered")}
					>
						<TbOutlineListNumbers size={12} />
					</ToolbarButton>,
				],
				[
					enabled.has("bulletList"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isBulletList}
						onClick={props.onToggleBulletList}
						disabled={props.disabled}
						title={T()("editor.rich.text.lists.bullet")}
					>
						<TbOutlineList size={12} />
					</ToolbarButton>,
				],
			],
			[
				[
					enabled.has("link"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={props.isLink}
						onClick={props.onOpenLinkModal}
						disabled={props.disabled}
						title={
							props.isLink
								? T()("editor.rich.text.link.edit")
								: T()("editor.rich.text.link.add")
						}
					>
						<TbOutlineLink size={12} />
					</ToolbarButton>,
				],
			],
			[
				[
					enabled.has("clearFormatting"),
					<ToolbarButton
						mode={toolbarButtonMode()}
						isActive={false}
						onClick={props.onClearFormatting}
						disabled={props.disabled}
						title={T()("editor.rich.text.formatting.clear")}
					>
						<TbOutlineEraser size={12} />
					</ToolbarButton>,
				],
			],
		];

		return all
			.map((group) =>
				group.filter(([show]) => show).map(([, control]) => control),
			)
			.filter((group) => group.length > 0);
	};

	// ----------------------------------------
	// Render
	return (
		<For each={groups()}>
			{(group, index) => (
				<>
					<Show when={index() > 0}>
						<div class="h-5 w-px bg-border" />
					</Show>
					{group}
				</>
			)}
		</For>
	);
};

export default ToolbarControls;
