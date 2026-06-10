import { FaSolidCheck, FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import T from "@/translations";

const AiDraftReviewPill: Component<{
	label: string;
	disabled?: boolean;
	onAccept: () => void;
	onReject: () => void;
}> = (props) => {
	// -------------------------------------
	// Render
	return (
		<div class="absolute top-0 right-full z-20 mr-1 flex h-5 items-center overflow-hidden rounded-md border border-primary-muted-border bg-primary-muted-bg/95 text-primary-base shadow-md backdrop-blur-sm">
			<span class="border-r border-primary-muted-border px-1.5 text-xs font-medium leading-none whitespace-nowrap">
				{props.label}
			</span>
			<div class="flex items-center">
				<button
					type="button"
					class="flex h-5 min-w-5 items-center justify-center text-primary-base fill-primary-base transition-colors duration-200 hover:bg-primary-base hover:text-primary-contrast hover:fill-primary-contrast focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60"
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
					class="flex h-5 min-w-5 items-center justify-center text-unfocused fill-unfocused transition-colors duration-200 hover:bg-error-base/15 hover:text-error-base hover:fill-error-base focus:outline-hidden focus-visible:ring-1 focus-visible:ring-error-base disabled:cursor-not-allowed disabled:opacity-60"
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
