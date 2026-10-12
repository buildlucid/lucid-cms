import { TbOutlinePhotoAi } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";

/** Shows an image generation placeholder using `ratio`, or a fixed height when omitted. */
const GeneratingImage: Component<{
	/** Width over height. */
	ratio?: number;
	/** Stops animation and shows the waiting state. */
	paused?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		props.paused
			? T()("ai.media.generate.response.inflight.title")
			: T()("ai.media.image.generating"),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			role="img"
			aria-label={label()}
			title={label()}
			class="rectangle-background relative w-full overflow-hidden rounded-lg border border-border transition-[aspect-ratio] duration-300 ease-emphasized motion-reduce:transition-none"
			classList={{ "h-72": props.ratio === undefined }}
			style={{ "aspect-ratio": props.ratio }}
		>
			<Show when={!props.paused}>
				<div
					aria-hidden="true"
					class="skeleton-shimmer absolute inset-0 z-10 opacity-70"
				/>
			</Show>
			<div class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-muted">
				<TbOutlinePhotoAi
					size={28}
					class={props.paused ? undefined : "motion-safe:animate-pulse"}
					aria-hidden="true"
				/>
				<Show when={props.paused}>
					<p class="text-xs font-medium" aria-hidden="true">
						{label()}
					</p>
				</Show>
			</div>
		</div>
	);
};

export default GeneratingImage;
