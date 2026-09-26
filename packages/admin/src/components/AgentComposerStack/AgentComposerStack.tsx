import type { AgentInput, AgentQuestionKind } from "@types";
import classnames from "classnames";
import {
	FaSolidBolt,
	FaSolidCircleQuestion,
	FaSolidClock,
	FaSolidPause,
	FaSolidPen,
	FaSolidPlay,
	FaSolidShieldHalved,
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
	/** The question the run is waiting on. It is answered from the chat box. */
	question?: { kind: AgentQuestionKind; question: string };
	/** Steering needs a run to redirect. */
	canSteer: boolean;
	onSteer: (input: AgentInput) => void;
	onEdit: (input: AgentInput) => void;
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
	tone?: "default" | "highlight";
	children?: JSX.Element;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li
			class={classnames("flex min-h-9 items-center gap-2 px-3 py-1 text-xs", {
				"bg-background text-body": props.tone !== "highlight",
				"bg-primary-low text-title": props.tone === "highlight",
			})}
		>
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
				<RowAction
					label={T()("agent.queue.edit")}
					onClick={() => props.onEdit(props.input)}
				>
					<FaSolidPen size={11} />
				</RowAction>
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
 * Rows attached to the top of the chat box: the question being answered, a
 * paused queue and queued messages, stacked as one piece.
 */
const AgentComposerStack: Component<AgentComposerStackProps> = (props) => {
	// ----------------------------------------
	// Memos
	//* a paused queue only shows while it holds messages
	const visible = createMemo(
		() => props.question !== undefined || props.inputs.length > 0,
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={visible()}>
			<ul
				class="mx-3 max-h-48 divide-y divide-border overflow-y-auto rounded-t-xl border border-b-0 border-border"
				aria-label={T()("agent.queue.label")}
				aria-live="polite"
			>
				<Show when={props.question}>
					{(question) => (
						<Row
							tone="highlight"
							icon={
								<Show
									when={question().kind === "approval"}
									fallback={<FaSolidCircleQuestion size={12} />}
								>
									<FaSolidShieldHalved size={12} />
								</Show>
							}
							text={T()(
								question().kind === "approval"
									? "agent.queue.approval"
									: "agent.queue.question",
								{ question: question().question },
							)}
						/>
					)}
				</Show>
				<Show when={props.paused && props.inputs.length}>
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
