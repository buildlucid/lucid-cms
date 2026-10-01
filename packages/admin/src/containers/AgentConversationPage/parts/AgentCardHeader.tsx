import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

const AgentCardHeader: Component<{
	id: string;
	label: string;
	title: string;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex items-start gap-3">
			<div class="min-w-0 grow">
				<p class="text-[11px] text-muted">{props.label}</p>
				<h3
					id={props.id}
					class="truncate text-sm font-medium text-title"
					title={props.title}
				>
					{props.title}
				</h3>
			</div>
			<button
				type="button"
				class="-me-1 flex size-6 shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				aria-label={T()("common.close")}
				title={T()("common.close")}
				onClick={() => props.onClose()}
			>
				<FaSolidXmark size={12} />
			</button>
		</div>
	);
};

export default AgentCardHeader;
