import classnames from "classnames";
import {
	type Component,
	createSignal,
	createUniqueId,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import T from "@/translations";

const collapsedHeight = 112;

/** A person's message. A pending one, such as a steer the run hasn't taken yet, is outlined and faded. */
const AgentUserBubble: Component<{
	children: JSX.Element;
	pending?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [expanded, setExpanded] = createSignal(false);
	const [expandable, setExpandable] = createSignal(false);
	const id = createUniqueId();
	let content: HTMLDivElement | undefined;

	// ----------------------------------------
	// Effects
	//* observes the unclipped content, so the toggle follows the panel's width
	onMount(() => {
		const element = content;
		if (!element) return;
		const observer = new ResizeObserver(() =>
			setExpandable(element.offsetHeight > collapsedHeight),
		);
		observer.observe(element);
		onCleanup(() => observer.disconnect());
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"max-w-[85%] rounded-2xl rounded-ee-md px-4 py-2.5",
				props.pending
					? "border border-dashed border-border bg-background"
					: "bg-input",
			)}
		>
			<div
				id={id}
				class={classnames("overflow-hidden", { "opacity-60": props.pending })}
				style={
					expandable() && !expanded()
						? { "max-height": `${collapsedHeight}px` }
						: undefined
				}
			>
				<div ref={content}>{props.children}</div>
			</div>
			<Show when={expandable()}>
				<div class="relative flex justify-end pt-1">
					<Show when={!expanded()}>
						<div
							aria-hidden="true"
							class={classnames(
								"pointer-events-none absolute -inset-x-4 bottom-full h-10 bg-linear-to-t to-transparent",
								props.pending ? "from-background" : "from-input",
							)}
						/>
					</Show>
					<button
						type="button"
						class="rounded-sm text-sm text-muted transition-colors hover:text-body focus-ring"
						aria-expanded={expanded()}
						aria-controls={id}
						onClick={() => setExpanded((value) => !value)}
					>
						{T()(expanded() ? "common.show_less" : "agent.message.expand")}
					</button>
				</div>
			</Show>
		</div>
	);
};

export default AgentUserBubble;
