import classnames from "classnames";
import { TbOutlineEyeOff, TbOutlineGripVertical } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import Tooltip from "@/components/Tooltip/Tooltip";
import T from "@/translations";

const sizeLabels = {
	sm: { short: "home.widget.size.sm.short", long: "home.widget.size.sm" },
	md: { short: "home.widget.size.md.short", long: "home.widget.size.md" },
	lg: { short: "home.widget.size.lg.short", long: "home.widget.size.lg" },
	full: { short: "home.widget.size.full.short", long: "home.widget.size.full" },
} as const satisfies Record<HomeWidgetSize, { short: string; long: string }>;

const controlClass =
	"flex h-6 items-center justify-center rounded-sm text-xs transition-colors focus-ring";

/**
 * The bar above a widget while the overview is being customised: its name and
 * controls to move, resize or hide it. The grip reorders with arrow keys;
 * dragging is handled by the widget's cell.
 */
const HomeWidgetControls: Component<{
	widgetKey: string;
	label: string;
	size: HomeWidgetSize;
	sizes: readonly HomeWidgetSize[];
	dropTarget: boolean;
	onMove: (offset: -1 | 1) => void;
	onResize: (size: HomeWidgetSize) => void;
	onHide: () => void;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const onGripKeyDown = (event: KeyboardEvent) => {
		const offset = {
			ArrowLeft: -1,
			ArrowUp: -1,
			ArrowRight: 1,
			ArrowDown: 1,
		}[event.key];
		if (offset === undefined) return;
		event.preventDefault();
		props.onMove(offset === -1 ? -1 : 1);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"flex h-8 min-w-0 cursor-grab items-center gap-1 rounded-md border bg-card px-1 transition-colors active:cursor-grabbing",
				{
					"border-primary": props.dropTarget,
					"border-border": !props.dropTarget,
				},
			)}
		>
			<button
				type="button"
				data-home-widget-grip={props.widgetKey}
				class={classnames(
					controlClass,
					"w-6 shrink-0 cursor-grab text-icon hover:text-title active:cursor-grabbing",
				)}
				aria-label={T()("home.widget.move", { name: props.label })}
				onKeyDown={onGripKeyDown}
			>
				<TbOutlineGripVertical size={12} />
			</button>
			<span class="min-w-0 grow truncate text-xs text-body">{props.label}</span>
			<fieldset class="flex shrink-0 items-center gap-0.5">
				<legend class="sr-only">
					{T()("home.widget.size.label", { name: props.label })}
				</legend>
				<For each={props.sizes}>
					{(size) => (
						<Tooltip
							type="button"
							aria-pressed={props.size === size}
							content={T()(sizeLabels[size].long)}
							aria-label={T()(sizeLabels[size].long)}
							onClick={() => props.onResize(size)}
							class={classnames(controlClass, "min-w-6 px-1.5", {
								"bg-card-hover text-title": props.size === size,
								"text-muted hover:text-title": props.size !== size,
							})}
						>
							{T()(sizeLabels[size].short)}
						</Tooltip>
					)}
				</For>
			</fieldset>
			<span class="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
			<Tooltip
				type="button"
				class={classnames(
					controlClass,
					"w-6 shrink-0 text-icon hover:text-title",
				)}
				aria-label={T()("home.widget.hide", { name: props.label })}
				content={T()("home.widget.hide", { name: props.label })}
				onClick={() => props.onHide()}
			>
				<TbOutlineEyeOff size={12} />
			</Tooltip>
		</div>
	);
};

export default HomeWidgetControls;
