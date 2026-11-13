import classNames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Accessor, type Component, For } from "solid-js";
import { getButtonClasses } from "@/components/Button/classes";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";
import type { PreviewZoom } from "./PreviewCanvas";

const zoomOptions: PreviewZoom[] = ["fit", 25, 50, 75, 100];

/** The toolbar's zoom menu, labelled with the scale the page is drawn at. */
export const PreviewZoomControl: Component<{
	zoom: Accessor<PreviewZoom>;
	/** The scale the page is drawn at, which fit zoom works out. */
	zoomScale: Accessor<number>;
	onZoom: (zoom: PreviewZoom) => void;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const zoomLabel = (zoom: PreviewZoom) =>
		zoom === "fit"
			? T()("preview.zoom.fit", { zoom: Math.round(props.zoomScale() * 100) })
			: `${zoom}%`;

	// ----------------------------------------
	// Render
	return (
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
	);
};
