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

const AgentUserBubble: Component<{
	children: JSX.Element;
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
		<div class="max-w-[85%] rounded-2xl rounded-ee-md bg-input px-4 py-2.5">
			<div
				id={id}
				class="overflow-hidden"
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
							class="pointer-events-none absolute -inset-x-4 bottom-full h-10 bg-linear-to-t from-input to-transparent"
						/>
					</Show>
					<button
						type="button"
						class="rounded-sm text-sm text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
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
