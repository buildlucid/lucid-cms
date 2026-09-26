import type { AgentInput } from "@types";
import {
	FaSolidBolt,
	FaSolidClock,
	FaSolidPause,
	FaSolidPen,
	FaSolidPlay,
	FaSolidTrash,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createMemo,
	For,
	type JSX,
	Match,
	Show,
	Switch,
} from "solid-js";
import { markdownPreview } from "@/components/AgentMessage/parts/AgentMarkdown";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

export interface AgentComposerStackProps {
	inputs: AgentInput[];
	paused: boolean;
	/** Steering needs a run to redirect. */
	canSteer: boolean;
	onSteer: (input: AgentInput) => void;
	/** Leave out to hide the edit action. */
	onEdit?: (input: AgentInput) => void;
	onCancel: (input: AgentInput) => void;
	onResume: () => void;
	onClear: () => void;
}

/** A small icon button for a row's actions. */
const RowAction: Component<{
	label: string;
	onClick: () => void;
	children: JSX.Element;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class="flex size-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-card-hover hover:text-title focus-visible:outline-2 focus-visible:outline-primary"
			aria-label={props.label}
			title={props.label}
			onClick={() => props.onClick()}
		>
			{props.children}
		</button>
	);
};

/** One row of the stack: an icon, a single line of text and its actions. */
const Row: Component<{
	icon: JSX.Element;
	text: string;
	title?: string;
	children?: JSX.Element;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li class="flex min-h-9 items-center gap-2 bg-background px-3 py-1 text-xs text-body">
			<span class="flex size-4 shrink-0 items-center justify-center text-muted">
				{props.icon}
			</span>
			<span class="min-w-0 grow truncate" title={props.title ?? props.text}>
				{props.text}
			</span>
			<Show when={props.children}>
				<span class="flex shrink-0 items-center gap-0.5">{props.children}</span>
			</Show>
		</li>
	);
};

/** A queued or steering message. Claimed messages are on their way, so they have no actions. */
const InputRow: Component<
	Pick<
		AgentComposerStackProps,
		"canSteer" | "onSteer" | "onEdit" | "onCancel"
	> & { input: AgentInput }
> = (props) => {
	// ----------------------------------------
	// Memos
	const preview = createMemo(() => markdownPreview(props.input.text));
	const steering = createMemo(() => props.input.delivery.kind === "steer");

	// ----------------------------------------
	// Render
	return (
		<Row
			text={preview()}
			icon={
				<Switch fallback={<FaSolidClock size={11} />}>
					<Match when={props.input.status === "claimed" || steering()}>
						<Spinner size="sm" />
					</Match>
				</Switch>
			}
			title={`${T()(
				props.input.status === "claimed"
					? "agent.queue.delivering"
					: steering()
						? "agent.queue.steering"
						: "agent.queue.queued",
			)}: ${preview()}`}
		>
			<Show when={props.input.status === "pending" && !steering()}>
				<Show when={props.canSteer}>
					<RowAction
						label={T()("agent.queue.steer")}
						onClick={() => props.onSteer(props.input)}
					>
						<FaSolidBolt size={11} />
					</RowAction>
				</Show>
				<Show when={props.onEdit}>
					{(onEdit) => (
						<RowAction
							label={T()("agent.queue.edit")}
							onClick={() => onEdit()(props.input)}
						>
							<FaSolidPen size={11} />
						</RowAction>
					)}
				</Show>
				<RowAction
					label={T()("agent.queue.remove")}
					onClick={() => props.onCancel(props.input)}
				>
					<FaSolidXmark size={12} />
				</RowAction>
			</Show>
		</Row>
	);
};

/**
 * Rows attached to the top of the chat box or question box: a paused queue and
 * queued messages, stacked as one piece. A paused queue only shows while it
 * holds messages.
 */
const AgentComposerStack: Component<AgentComposerStackProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.inputs.length > 0}>
			<ul
				class="mx-3 max-h-48 divide-y divide-border overflow-y-auto rounded-t-xl border border-b-0 border-border"
				aria-label={T()("agent.queue.label")}
				aria-live="polite"
			>
				<Show when={props.paused}>
					<Row
						icon={<FaSolidPause size={10} />}
						text={T()("agent.queue.paused")}
					>
						<RowAction
							label={T()("agent.queue.resume")}
							onClick={props.onResume}
						>
							<FaSolidPlay size={10} />
						</RowAction>
						<RowAction label={T()("agent.queue.clear")} onClick={props.onClear}>
							<FaSolidTrash size={10} />
						</RowAction>
					</Row>
				</Show>
				<For each={props.inputs}>
					{(input) => (
						<InputRow
							input={input}
							canSteer={props.canSteer}
							onSteer={props.onSteer}
							onEdit={props.onEdit}
							onCancel={props.onCancel}
						/>
					)}
				</For>
			</ul>
		</Show>
	);
};

export default AgentComposerStack;
