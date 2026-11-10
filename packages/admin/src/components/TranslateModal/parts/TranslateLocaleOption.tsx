import { TbOutlineX } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import T from "@/translations";

/** A language in the translate modal's language select, with its translation status. */
const TranslateLocaleOption: Component<{
	label: string;
	status?: string;
	removeValue?: () => void;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<span class="flex min-w-0 w-full items-center gap-2">
			<span class="flex min-w-0 flex-col">
				<span class="truncate text-sm text-title">{props.label}</span>
				<Show when={props.status}>
					{(status) => (
						<span class="truncate text-xs text-body">{status()}</span>
					)}
				</Show>
			</span>
			<Show when={props.removeValue}>
				{(removeValue) => (
					<button
						type="button"
						aria-label={`${T()("common.remove")} ${props.label}`}
						class="ml-auto flex size-5 shrink-0 items-center justify-center rounded-sm text-body opacity-0 transition-all group-hover:opacity-100 hover:bg-danger hover:text-danger-foreground focus:opacity-100 focus-ring"
						onPointerDown={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							removeValue()();
						}}
					>
						<TbOutlineX size={12} />
					</button>
				)}
			</Show>
		</span>
	);
};

export default TranslateLocaleOption;
