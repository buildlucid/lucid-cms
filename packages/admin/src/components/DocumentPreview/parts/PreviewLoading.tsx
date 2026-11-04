import type { Component } from "solid-js";
import T from "@/translations";

/**
 * Preview loading placeholder sized to the frame. Shared with the editor skeleton to avoid layout
 * shifts.
 */
export const PreviewLoading: Component<{
	/** The frame's width on screen. Fills the space when left out. */
	width?: number;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			role="status"
			aria-live="polite"
			class="absolute inset-0 z-20 flex justify-center overflow-hidden bg-card dotted-background"
		>
			<span class="sr-only">{T()("preview.loading")}</span>
			<div
				aria-hidden="true"
				class="@container relative flex h-full w-full flex-col gap-10 overflow-hidden bg-background/60 px-6 py-5 opacity-60"
				style={props.width ? { "max-width": `${props.width}px` } : undefined}
			>
				<div class="flex items-center justify-between gap-4">
					<span class="skeleton block h-6 w-24" />
					<div class="hidden items-center gap-5 @lg:flex">
						<span class="skeleton block h-3 w-14" />
						<span class="skeleton block h-3 w-12" />
						<span class="skeleton block h-3 w-16" />
					</div>
					<span class="skeleton block h-8 w-20" />
				</div>
				<div class="flex flex-col items-center gap-3 pt-8">
					<span class="skeleton block h-8 w-3/4 max-w-xl" />
					<span class="skeleton block h-8 w-1/2 max-w-md" />
					<span class="skeleton mt-3 block h-3 w-2/3 max-w-lg" />
					<span class="skeleton block h-3 w-1/2 max-w-md" />
					<div class="mt-4 flex gap-3">
						<span class="skeleton block h-9 w-28" />
						<span class="skeleton block h-9 w-28" />
					</div>
				</div>
				<span class="skeleton block h-64 w-full shrink-0" />
				<div class="grid shrink-0 grid-cols-1 gap-5 @xl:grid-cols-3">
					<div class="flex flex-col gap-2">
						<span class="skeleton block h-32 w-full" />
						<span class="skeleton block h-3 w-2/3" />
						<span class="skeleton block h-3 w-1/2" />
					</div>
					<div class="flex flex-col gap-2">
						<span class="skeleton block h-32 w-full" />
						<span class="skeleton block h-3 w-3/5" />
						<span class="skeleton block h-3 w-2/5" />
					</div>
					<div class="flex flex-col gap-2">
						<span class="skeleton block h-32 w-full" />
						<span class="skeleton block h-3 w-1/2" />
						<span class="skeleton block h-3 w-1/3" />
					</div>
				</div>
			</div>
		</div>
	);
};
