import classNames from "classnames";
import { type Component, onCleanup } from "solid-js";
import type { UseBuilderSplit } from "@/hooks/useBuilderSplit/useBuilderSplit";
import T from "@/translations";

/**
 * Resize handle between fields and preview, with an expanded hit area and grip on hover, focus or
 * drag.
 */
const BuilderSplitHandle: Component<{ split: UseBuilderSplit }> = (props) => {
	// ----------------------------------------
	// Effects
	//* the preview can close mid-drag, eg. from its shortcut, taking the handle and its pointer listeners with it
	onCleanup(() => props.split.endDrag());

	// ----------------------------------------
	// Render
	return (
		<div
			role="separator"
			tabIndex={0}
			aria-orientation="vertical"
			aria-label={T()("builder.split.resize")}
			aria-valuemin={props.split.min}
			aria-valuemax={props.split.max()}
			aria-valuenow={props.split.size()}
			title={T()("builder.split.hint")}
			onPointerDown={(event) => props.split.onPointerDown(event)}
			onKeyDown={(event) => props.split.onKeyDown(event)}
			onDblClick={() => props.split.reset()}
			class="group/handle relative z-20 flex w-px shrink-0 cursor-col-resize touch-none items-center justify-center bg-border outline-none"
		>
			<span aria-hidden="true" class="absolute inset-y-0 -inset-x-1.5" />
			<span
				aria-hidden="true"
				class={classNames(
					"pointer-events-none relative h-10 w-1 rounded-full transition-colors duration-150",
					props.split.dragging()
						? "bg-primary"
						: "bg-transparent group-hover/handle:bg-muted group-focus-visible/handle:bg-primary",
				)}
			/>
		</div>
	);
};

export default BuilderSplitHandle;
