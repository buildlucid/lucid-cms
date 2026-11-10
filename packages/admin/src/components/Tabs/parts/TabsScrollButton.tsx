import classNames from "classnames";
import { TbOutlineChevronLeft, TbOutlineChevronRight } from "solid-icons/tb";
import { type Component, Show } from "solid-js";

/**
 * Scrolls overflowing tabs over an edge fade. Excluded from tab order because tabs support
 * keyboard navigation.
 */
export const TabsScrollButton: Component<{
	edge: "start" | "end";
	onClick: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			aria-hidden="true"
			class={classNames(
				"pointer-events-none absolute inset-y-1 z-20 flex w-12 items-center from-card from-45% to-transparent",
				props.edge === "start"
					? "inset-s-1 justify-start rounded-s-sm bg-linear-to-r rtl:bg-linear-to-l"
					: "inset-e-1 justify-end rounded-e-sm bg-linear-to-l rtl:bg-linear-to-r",
			)}
		>
			<button
				type="button"
				tabIndex={-1}
				class="pointer-events-auto flex size-6 items-center justify-center rounded-sm text-muted transition-colors hover:bg-card-hover hover:text-title"
				onClick={() => props.onClick()}
			>
				<Show
					when={props.edge === "start"}
					fallback={<TbOutlineChevronRight size={14} class="rtl:rotate-180" />}
				>
					<TbOutlineChevronLeft size={14} class="rtl:rotate-180" />
				</Show>
			</button>
		</div>
	);
};
