import classnames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import {
	createEffect,
	createUniqueId,
	type JSX,
	on,
	type ParentComponent,
} from "solid-js";
import T from "@/translations";

const AgentSidebarCard: ParentComponent<{
	title: JSX.Element;
	onClose: () => void;
	/** Scrolls the card into view when it opens and whenever this changes, such as when another call is selected. */
	reveal?: string;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();
	let card: HTMLElement | undefined;

	// ----------------------------------------
	// Effects
	//* the details card can push this below the fold of the sidebar. Scrolling waits for the
	//* slide-in, otherwise the off-screen start position scrolls the whole sidebar sideways
	createEffect(
		on(
			() => props.reveal,
			async (reveal) => {
				if (reveal === undefined) return;

				await new Promise(requestAnimationFrame);
				if (!card) return;

				await Promise.allSettled(
					card.getAnimations().map((animation) => animation.finished),
				);

				card.scrollIntoView({
					block: "nearest",
					behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
						.matches
						? "auto"
						: "smooth",
				});
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<aside
			ref={card}
			aria-labelledby={id}
			class={classnames(
				"flex scroll-my-4 flex-col gap-5 rounded-xl border border-border bg-card p-4 animate-slide-from-right-in md:p-5",
				props.class,
			)}
		>
			<div class="flex items-start justify-between gap-2">
				<h3 id={id} class="wrap-break-words text-sm font-medium text-title">
					{props.title}
				</h3>
				<button
					type="button"
					class="-mt-0.5 -me-1 flex size-6 shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					aria-label={T()("common.close")}
					title={T()("common.close")}
					onClick={() => props.onClose()}
				>
					<FaSolidXmark size={12} />
				</button>
			</div>
			{props.children}
		</aside>
	);
};

export default AgentSidebarCard;
