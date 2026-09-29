import classnames from "classnames";
import { FaSolidChevronRight } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	createUniqueId,
	type JSXElement,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import AgentSidebarCard from "@/components/AgentSidebarCard/AgentSidebarCard";
import { useAgentTranscript } from "./AgentTranscriptContext";

export interface AgentTranscriptRowProps {
	icon: JSXElement;
	label: JSXElement;
	children?: JSXElement;
	/** Whether the row has details to open. Defaults to the presence of children or a panel. */
	expandable?: boolean;
	/** Renders a panel that opens in the chat's sidebar instead of expanding. Only called while open; outside a chat it expands in place. */
	renderPanel?: () => JSXElement;
	/** The sidebar panel's heading. @default label */
	panelTitle?: JSXElement;
	class?: string;
}

/**
 * A compact transcript row, such as a finished interaction. Selecting it
 * expands its content below, or opens its panel in the chat's sidebar, where
 * Lucid adds the heading and close button.
 *
 * @example
 * ```tsx
 * import { AgentTranscriptRow } from "@lucidcms/admin/components";
 *
 * return (
 * 	<AgentTranscriptRow
 * 		icon={<NoteIcon />}
 * 		label={`${props.interaction?.title} · ${props.status}`}
 * 		panelTitle={props.data.title}
 * 		renderPanel={() => <NoteCard note={props.data} />}
 * 	/>
 * );
 * ```
 */
const AgentTranscriptRow: Component<AgentTranscriptRowProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();
	const transcript = useAgentTranscript();
	const [expanded, setExpanded] = createSignal(false);

	// ----------------------------------------
	// Memos
	const expandable = createMemo(
		() =>
			props.expandable ??
			(props.children !== undefined || props.renderPanel !== undefined),
	);
	const inSidebar = createMemo(
		() => props.renderPanel !== undefined && transcript !== undefined,
	);
	const selected = createMemo(() => transcript?.selected() === id);
	const open = createMemo(() => (inSidebar() ? selected() : expanded()));

	// ----------------------------------------
	// Functions
	const toggle = () => {
		if (inSidebar()) transcript?.select(selected() ? undefined : id);
		else setExpanded((value) => !value);
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		if (selected()) transcript?.select(undefined);
	});

	// ----------------------------------------
	// Render
	const heading = () => (
		<>
			<span
				class="flex size-3.5 shrink-0 items-center justify-center"
				aria-hidden="true"
			>
				{props.icon}
			</span>
			<span class="min-w-0 truncate">{props.label}</span>
		</>
	);

	return (
		<div class={classnames("flex w-full flex-col items-start", props.class)}>
			<Show
				when={expandable()}
				fallback={
					<div class="-ms-2 flex max-w-full items-center gap-2 px-2 py-1 text-start text-xs text-muted">
						{heading()}
					</div>
				}
			>
				<button
					type="button"
					class={classnames(
						"group -ms-2 flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-start text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
						selected()
							? "bg-card text-title"
							: "text-muted hover:bg-card hover:text-body",
					)}
					aria-expanded={inSidebar() ? undefined : open()}
					aria-pressed={inSidebar() ? open() : undefined}
					aria-controls={inSidebar() ? undefined : id}
					onClick={toggle}
				>
					{heading()}
					<Show when={!inSidebar()}>
						<FaSolidChevronRight
							size={8}
							class="shrink-0 transition-transform"
							classList={{ "rotate-90": open() }}
						/>
					</Show>
				</button>
			</Show>
			<Show
				when={expandable() && inSidebar()}
				fallback={
					<Show when={expandable()}>
						<div
							id={id}
							hidden={!open()}
							class="mt-1 mb-1 ms-1.5 min-w-0 self-stretch border-s border-border ps-4"
						>
							<Show when={open()}>
								{props.renderPanel?.() ?? props.children}
							</Show>
						</div>
					</Show>
				}
			>
				<Show when={selected() && transcript?.sidebar()}>
					{(sidebar) => (
						<Portal mount={sidebar()}>
							<AgentSidebarCard
								title={props.panelTitle ?? props.label}
								reveal={id}
								onClose={() => transcript?.select(undefined)}
							>
								{props.renderPanel?.()}
							</AgentSidebarCard>
						</Portal>
					)}
				</Show>
			</Show>
		</div>
	);
};

export default AgentTranscriptRow;
