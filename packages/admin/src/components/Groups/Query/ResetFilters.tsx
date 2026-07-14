import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

export const ResetFilters: Component<{
	onReset: () => void;
}> = (props) => (
	<button
		type="button"
		class={classNames(
			"z-20 relative text-sm flex items-center gap-1.5 hover:text-error-hover duration-200 transition-colors group",
			"md:ml-2",
		)}
		onClick={(event) => {
			event.stopPropagation();
			event.preventDefault();
			props.onReset();
		}}
	>
		<FaSolidXmark class="text-error-base group-hover:text-error-hover" />
		<span>{T()("actions.reset.filters")}</span>
	</button>
);
