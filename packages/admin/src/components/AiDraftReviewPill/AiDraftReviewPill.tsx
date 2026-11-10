import { TbOutlineCheck, TbOutlineX } from "solid-icons/tb";
import type { Component } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";
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
				<Tooltip
					type="button"
					class="flex h-5 min-w-5 items-center justify-center text-muted transition-colors hover:bg-card-hover hover:text-success focus-ring disabled:cursor-not-allowed disabled:opacity-50"
					content={T()("common.accept")}
					aria-label={T()("common.accept")}
					disabled={props.disabled}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						props.onAccept();
					}}
				>
					<TbOutlineCheck size={10} aria-hidden="true" />
				</Tooltip>
				<Tooltip
					type="button"
					class="flex h-5 min-w-5 items-center justify-center text-muted transition-colors hover:bg-card-hover hover:text-danger focus-ring disabled:cursor-not-allowed disabled:opacity-50"
					content={T()("common.reject")}
					aria-label={T()("common.reject")}
					disabled={props.disabled}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						props.onReject();
					}}
				>
					<TbOutlineX size={10} aria-hidden="true" />
				</Tooltip>
			</div>
		</div>
	);
};

export default AiDraftReviewPill;
