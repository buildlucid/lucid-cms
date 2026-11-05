import classNames from "classnames";
import {
	TbOutlineArrowsHorizontal,
	TbOutlineChevronDown,
	TbOutlineDeviceDesktop,
	TbOutlineDeviceMobile,
	TbOutlineDeviceTablet,
	TbOutlineExternalLink,
	TbOutlinePointer,
	TbOutlineRotateClockwise2,
} from "solid-icons/tb";
import { type Accessor, type Component, createMemo, For } from "solid-js";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import Menu from "@/components/Menu/Menu";
import SegmentedControl, {
	type SegmentedControlOption,
} from "@/components/SegmentedControl/SegmentedControl";
import T from "@/translations";
import type {
	PreviewWidthOption,
	PreviewWidthSelection,
	PreviewZoom,
} from "./PreviewCanvas";

const zoomOptions: PreviewZoom[] = ["fit", 25, 50, 75, 100];

/** Picks a device icon for a breakpoint by its width, as collections can name their own. */
const breakpointIcon = (width: number) => {
	if (width >= 1024) return <TbOutlineDeviceDesktop size={12} />;
	if (width >= 600) return <TbOutlineDeviceTablet size={12} />;
	return <TbOutlineDeviceMobile size={12} />;
};

/**
 * Preview header controls for width, zoom, editing, refresh and opening a tab. Custom widths clear
 * breakpoint selection. Narrow layouts hide secondary controls before the pixel width.
 */
export const PreviewToolbar: Component<{
	widthOptions: Accessor<PreviewWidthOption[]>;
	selectedWidth: Accessor<PreviewWidthSelection>;
	onSelectWidth: (selection: PreviewWidthSelection) => void;
	/** The width the page lays out at, in its own pixels. */
	layoutWidth: Accessor<number>;
	/** Sets a custom width from the input, clamped once editing ends. */
	onWidth: (value: string, clamp: boolean) => void;
	zoom: Accessor<PreviewZoom>;
	/** The scale the page is drawn at, which fit zoom works out. */
	zoomScale: Accessor<number>;
	onZoom: (zoom: PreviewZoom) => void;
	editMode: Accessor<boolean>;
	onToggleEditMode: () => void;
	actionLoading: Accessor<boolean>;
	onRefresh: () => void;
	onOpen: () => void;
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
	const zoomLabel = (zoom: PreviewZoom) =>
		zoom === "fit"
			? T()("preview.zoom.fit", { zoom: Math.round(props.zoomScale() * 100) })
			: `${zoom}%`;

	// ----------------------------------------
	// Render
	return (
		<div
			role="group"
			aria-label={T()("preview.options")}
			class="flex min-w-0 items-center gap-1"
		>
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
			<Menu.Root placement="bottom-start">
				<Menu.Trigger
					aria-label={T()("preview.zoom")}
					title={T()("preview.zoom")}
					class={classNames(
						getButtonClasses({
							variant: "toolbar",
							size: "xs",
							shape: "standard",
						}),
						"gap-1 font-medium tabular-nums text-subtitle",
					)}
				>
					{Math.round(props.zoomScale() * 100)}%
					<TbOutlineChevronDown size={10} class="text-icon" />
				</Menu.Trigger>
				<Menu.Content>
					<For each={zoomOptions}>
						{(zoom) => (
							<Menu.Item
								selected={props.zoom() === zoom}
								onSelect={() => props.onZoom(zoom)}
							>
								{zoomLabel(zoom)}
							</Menu.Item>
						)}
					</For>
				</Menu.Content>
			</Menu.Root>
			<span aria-hidden="true" class="mx-1 h-4 w-px shrink-0 bg-border" />
			<Button
				type="button"
				variant="toolbar"
				size="xs"
				shape="square"
				title={T()("preview.edit.label")}
				aria-label={T()("preview.edit.label")}
				aria-pressed={props.editMode()}
				class="aria-pressed:text-primary aria-pressed:hover:text-primary-hover"
				onClick={() => props.onToggleEditMode()}
			>
				<TbOutlinePointer size={12} />
			</Button>
			<div class="hidden shrink-0 items-center gap-1 @2xl/preview-bar:flex">
				<Button
					type="button"
					variant="toolbar"
					size="xs"
					shape="square"
					title={T()("common.refresh")}
					aria-label={T()("common.refresh")}
					onClick={() => props.onRefresh()}
				>
					<TbOutlineRotateClockwise2 size={12} />
				</Button>
				<Button
					type="button"
					variant="toolbar"
					size="xs"
					shape="square"
					title={T()("preview.open")}
					aria-label={T()("preview.open")}
					loading={props.actionLoading()}
					onClick={() => props.onOpen()}
				>
					<TbOutlineExternalLink size={12} />
				</Button>
			</div>
		</div>
	);
};
