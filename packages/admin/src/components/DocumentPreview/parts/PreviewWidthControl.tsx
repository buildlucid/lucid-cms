import {
	TbOutlineArrowsHorizontal,
	TbOutlineDeviceDesktop,
	TbOutlineDeviceMobile,
	TbOutlineDeviceTablet,
} from "solid-icons/tb";
import { type Accessor, type Component, createMemo } from "solid-js";
import SegmentedControl, {
	type SegmentedControlOption,
} from "@/components/SegmentedControl/SegmentedControl";
import T from "@/translations";
import type {
	PreviewWidthOption,
	PreviewWidthSelection,
} from "./PreviewCanvas";

/** Picks a device icon for a breakpoint by its width, as collections can name their own. */
const breakpointIcon = (width: number) => {
	if (width >= 1024) return <TbOutlineDeviceDesktop size={12} />;
	if (width >= 600) return <TbOutlineDeviceTablet size={12} />;
	return <TbOutlineDeviceMobile size={12} />;
};

/** The toolbar's width switch and pixel width. Custom widths clear the breakpoint, and narrow toolbars hide the pixel width. */
export const PreviewWidthControl: Component<{
	widthOptions: Accessor<PreviewWidthOption[]>;
	selectedWidth: Accessor<PreviewWidthSelection>;
	onSelectWidth: (selection: PreviewWidthSelection) => void;
	/** The width the page lays out at, in its own pixels. */
	layoutWidth: Accessor<number>;
	/** Sets a custom width from the input, clamped once editing ends. */
	onWidth: (value: string, clamp: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const widthSwitchOptions = createMemo(
		(): SegmentedControlOption<string>[] => [
			{
				value: "fit",
				label: T()("preview.width.fit"),
				icon: <TbOutlineArrowsHorizontal size={12} />,
			},
			...props.widthOptions().map((option) => ({
				value: `breakpoint:${option.key}`,
				label: option.label,
				icon: breakpointIcon(option.width),
			})),
		],
	);
	const widthSwitchValue = createMemo(() => {
		const selection = props.selectedWidth();
		if (selection === "custom") return undefined;
		return selection === "fit" ? "fit" : `breakpoint:${selection.key}`;
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<SegmentedControl
				label={T()("preview.width.mode")}
				value={widthSwitchValue()}
				options={widthSwitchOptions()}
				onChange={(value) =>
					props.onSelectWidth(
						value === "fit"
							? "fit"
							: { type: "breakpoint", key: value.slice("breakpoint:".length) },
					)
				}
			/>
			<label class="hidden h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted transition-colors hover:bg-background-hover focus-within:bg-background-hover @xl/preview-bar:flex">
				<span class="sr-only">{T()("preview.width.input")}</span>
				<input
					type="number"
					value={Math.round(props.layoutWidth())}
					class="no-number-spinner w-10 appearance-none bg-transparent text-end font-medium tabular-nums text-subtitle outline-none"
					onInput={(event) => props.onWidth(event.currentTarget.value, false)}
					onChange={(event) => props.onWidth(event.currentTarget.value, true)}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
					}}
				/>
				<span aria-hidden="true">px</span>
			</label>
		</>
	);
};
