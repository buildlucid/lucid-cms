import { FaSolidCheck, FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

/**
 * Sits beside an AI action button after it fills a field, so the draft can be
 * kept or the field restored to what it held before.
 */
const AiDraftReviewPill: Component<{
	label: string;
	disabled?: boolean;
	onAccept: () => void;
	onReject: () => void;
}> = (props) => {
	// -------------------------------------
	// Render
	return (
		<div class="absolute top-0 right-full z-20 mr-1 flex h-5 items-center overflow-hidden rounded-md border border-border bg-card text-muted">
			<span class="border-r border-border px-1.5 text-xs leading-none whitespace-nowrap">
				{props.label}
			</span>
			<div class="flex items-center">
				<button
					type="button"
					class="flex h-5 min-w-5 items-center justify-center text-muted fill-muted transition-colors duration-200 hover:bg-card-hover hover:text-success hover:fill-success focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
					title={T()("common.accept")}
					aria-label={T()("common.accept")}
					disabled={props.disabled}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						props.onAccept();
					}}
				>
					<FaSolidCheck size={10} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="flex h-5 min-w-5 items-center justify-center text-muted fill-muted transition-colors duration-200 hover:bg-card-hover hover:text-danger hover:fill-danger focus:outline-hidden focus-visible:ring-1 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-60"
					title={T()("common.reject")}
					aria-label={T()("common.reject")}
					disabled={props.disabled}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						props.onReject();
					}}
				>
					<FaSolidXmark size={10} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
};

export default AiDraftReviewPill;
