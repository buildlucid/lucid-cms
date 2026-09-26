import { Popover } from "@kobalte/core";
import type { AgentContext } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

export interface AgentContextRingProps {
	context: AgentContext;
	/** Hides the compact action while the agent is working or waiting on an answer. */
	busy: boolean;
	onCompact: () => void;
}

//* the delays let the pointer cross the gap between the ring and its popover
const openDelay = 150;
const closeDelay = 250;
const radius = 7;
const circumference = 2 * Math.PI * radius;
const tokenFormat = new Intl.NumberFormat(undefined, {
	notation: "compact",
	maximumFractionDigits: 1,
});

/**
 * How full the conversation's context is. Hovering or focusing the ring explains
 * it and, once context is nearly full, offers to compact before it happens
 * automatically.
 */
const AgentContextRing: Component<AgentContextRingProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Memos
	const compacting = createMemo(() => props.context.status === "compacting");

	// ----------------------------------------
	// Functions
	const hover = (next: boolean) => (event: PointerEvent) => {
		if (event.pointerType !== "mouse") return;
		clearTimeout(timer);
		timer = setTimeout(() => setOpen(next), next ? openDelay : closeDelay);
	};
	const compact = () => {
		setOpen(false);
		props.onCompact();
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => clearTimeout(timer));

	// ----------------------------------------
	// Render
	return (
		<Popover.Root
			open={open()}
			onOpenChange={setOpen}
			placement="top-end"
			gutter={8}
		>
			<Popover.Trigger
				class="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
				aria-label={T()("agent.context.label", {
					percent: props.context.percent,
				})}
				onPointerEnter={hover(true)}
				onPointerLeave={hover(false)}
			>
				<svg
					viewBox="0 0 18 18"
					aria-hidden="true"
					class={classnames("size-5", { "animate-spin": compacting() })}
				>
					<g transform="rotate(-90 9 9)" fill="none" stroke-width="2">
						<circle cx="9" cy="9" r={radius} class="stroke-border" />
						<circle
							cx="9"
							cy="9"
							r={radius}
							stroke-linecap="round"
							stroke-dasharray={String(circumference)}
							stroke-dashoffset={
								compacting()
									? circumference * 0.75
									: circumference * (1 - props.context.percent / 100)
							}
							class={classnames(
								"transition-[stroke-dashoffset,stroke] duration-500",
								props.context.compactable ? "stroke-warning" : "stroke-muted",
							)}
						/>
					</g>
				</svg>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					class="z-60 w-72 rounded-md border border-border bg-popover p-3 shadow-md animate-dropdown focus:outline-hidden"
					onOpenAutoFocus={(event) => event.preventDefault()}
					onPointerEnter={hover(true)}
					onPointerLeave={hover(false)}
				>
					<div class="flex items-baseline justify-between gap-3 text-sm">
						<span class="font-medium text-title">
							{T()("agent.context.title")}
						</span>
						<span class="tabular-nums text-body">{props.context.percent}%</span>
					</div>
					<div
						role="progressbar"
						aria-label={T()("agent.context.title")}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={props.context.percent}
						class="mt-2 h-1.5 overflow-hidden rounded-full bg-input"
					>
						<div
							class={classnames(
								"h-full rounded-full transition-[width] duration-500",
								props.context.compactable ? "bg-warning" : "bg-primary",
							)}
							style={{ width: `${props.context.percent}%` }}
						/>
					</div>
					<p class="mt-2 text-xs tabular-nums text-muted">
						{T()("agent.context.tokens", {
							used: tokenFormat.format(props.context.tokens),
							limit: tokenFormat.format(props.context.tokenLimit),
						})}
					</p>
					<p class="mt-2 text-xs text-body">
						{compacting()
							? T()("agent.context.compacting")
							: T()("agent.context.description")}
					</p>
					<Show when={props.context.compactable && !props.busy}>
						<div class="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
							<span class="text-xs text-muted">
								{T()("agent.context.compact.cost")}
							</span>
							<Button size="xs" variant="secondary" onClick={compact}>
								{T()("agent.context.compact")}
							</Button>
						</div>
					</Show>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default AgentContextRing;
