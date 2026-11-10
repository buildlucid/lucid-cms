import { TbOutlinePencil, TbOutlineRobot } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";
import { HANDLE_SIZE } from "../utils/preview-handles";

/**
 * The selected field's name with its actions, drawn above its outline's right end: edit it, as
 * clicking it again does, and ask the agent about it.
 */
export const PreviewFieldBar: Component<{
	name: string;
	/** Where the bar's top right corner goes, in the overlay's pixels. */
	position: { x: number; y: number };
	/** Hides it without unmounting, eg. while the page scrolls. */
	hidden: boolean;
	onEdit?: () => void;
	onAsk?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class="pointer-events-auto absolute top-0 left-0 flex items-center gap-px rounded-md border border-border bg-background p-px shadow-floating transition-opacity duration-100 animate-dropdown"
			classList={{ "pointer-events-none opacity-0": props.hidden }}
			style={{
				translate: `max(4px, calc(${Math.round(props.position.x)}px - 100%)) ${Math.round(props.position.y)}px`,
				height: `${HANDLE_SIZE.height}px`,
			}}
		>
			<span class="max-w-40 truncate px-2 text-xs font-medium text-subtitle">
				{props.name}
			</span>
			<span class="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
			<Show when={props.onEdit}>
				{(edit) => (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="square"
						tooltip={T()("preview.edit.field.edit", { name: props.name })}
						aria-label={T()("preview.edit.field.edit", { name: props.name })}
						onClick={() => edit()()}
					>
						<TbOutlinePencil size={14} />
					</Button>
				)}
			</Show>
			<Show when={props.onAsk}>
				{(ask) => (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="square"
						tooltip={T()("preview.edit.ask")}
						aria-label={T()("preview.edit.ask")}
						onClick={() => ask()()}
					>
						<TbOutlineRobot size={14} />
					</Button>
				)}
			</Show>
		</div>
	);
};
