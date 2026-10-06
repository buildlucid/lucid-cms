import classnames from "classnames";
import { FaSolidEyeSlash, FaSolidGripVertical } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import T from "@/translations";

const sizeLabels = {
	sm: { short: "home.widget.size.sm.short", long: "home.widget.size.sm" },
	md: { short: "home.widget.size.md.short", long: "home.widget.size.md" },
	lg: { short: "home.widget.size.lg.short", long: "home.widget.size.lg" },
	full: { short: "home.widget.size.full.short", long: "home.widget.size.full" },
} as const satisfies Record<
	DashboardWidgetSize,
	{ short: string; long: string }
>;

const controlClass =
	"flex h-6 items-center justify-center rounded text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary";

/**
 * The bar above a widget while the overview is being customised: its name and
 * controls to move, resize or hide it. The grip reorders with arrow keys;
 * dragging is handled by the widget's cell.
 */
const HomeWidgetControls: Component<{
	widgetKey: string;
	label: string;
	size: DashboardWidgetSize;
	sizes: readonly DashboardWidgetSize[];
	dropTarget: boolean;
	onMove: (offset: -1 | 1) => void;
	onResize: (size: DashboardWidgetSize) => void;
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
				<FaSolidGripVertical size={11} />
			</button>
			<span class="min-w-0 grow truncate text-xs text-body">{props.label}</span>
			<fieldset class="flex shrink-0 items-center gap-0.5">
				<legend class="sr-only">
					{T()("home.widget.size.label", { name: props.label })}
				</legend>
				<For each={props.sizes}>
					{(size) => (
						<button
							type="button"
							aria-pressed={props.size === size}
							title={T()(sizeLabels[size].long)}
							aria-label={T()(sizeLabels[size].long)}
							onClick={() => props.onResize(size)}
							class={classnames(controlClass, "min-w-6 px-1.5", {
								"bg-card-hover text-title": props.size === size,
								"text-muted hover:text-title": props.size !== size,
							})}
						>
							{T()(sizeLabels[size].short)}
						</button>
					)}
				</For>
			</fieldset>
			<span class="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
			<button
				type="button"
				class={classnames(
					controlClass,
					"w-6 shrink-0 text-icon hover:text-title",
				)}
				aria-label={T()("home.widget.hide", { name: props.label })}
				title={T()("home.widget.hide", { name: props.label })}
				onClick={() => props.onHide()}
			>
				<FaSolidEyeSlash size={12} />
			</button>
		</div>
	);
};

export default HomeWidgetControls;
