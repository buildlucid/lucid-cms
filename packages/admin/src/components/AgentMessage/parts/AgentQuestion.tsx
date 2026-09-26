import type { AgentApprovalAnswer, AgentMessagePart } from "@types";
import classnames from "classnames";
import {
	FaSolidChevronRight,
	FaSolidCircleQuestion,
	FaSolidShieldHalved,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import T from "@/translations";

type QuestionPart = Extract<AgentMessagePart, { type: "question" }>;

/**
 * A question or approval the agent paused on, as a compact row in the chat.
 * Opening it shows the question and its answer. While it is pending it is
 * answered from the question box that replaces the chat box.
 */
const AgentQuestion: Component<{
	part: QuestionPart;
	pending: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const approval = createMemo(() => props.part.kind === "approval");
	const outcome = createMemo(() => {
		if (props.pending) return T()("agent.question.pending");
		if (props.part.dismissed) return T()("agent.question.dismissed.short");
		const answer = props.part.answer;
		if (answer === undefined || !approval()) return undefined;
		return answer === ("approve" satisfies AgentApprovalAnswer)
			? T()("agent.question.approved.short")
			: T()("agent.question.denied.short");
	});
	const answerText = createMemo(() => {
		if (props.part.dismissed) return T()("agent.question.dismissed");
		const answer = props.part.answer;
		if (answer === undefined || approval()) return undefined;
		return T()("agent.question.answered", { answer });
	});

	// ----------------------------------------
	// Render
	return (
		<div data-compact-row class="flex flex-col items-start">
			<button
				type="button"
				class="group -ml-2 flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-muted transition-colors hover:bg-card hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				aria-expanded={open()}
				onClick={() => setOpen((value) => !value)}
			>
				<span class="flex size-3.5 shrink-0 items-center justify-center">
					<Show
						when={approval()}
						fallback={<FaSolidCircleQuestion size={10} />}
					>
						<FaSolidShieldHalved size={10} />
					</Show>
				</span>
				<span class="min-w-0 truncate">
					{T()(
						approval()
							? "agent.question.asked.approval"
							: "agent.question.asked",
					)}
					<Show when={outcome()}>
						{(text) => (
							<span class={classnames({ "text-primary": props.pending })}>
								{" · "}
								{text()}
							</span>
						)}
					</Show>
				</span>
				<FaSolidChevronRight
					size={8}
					class={classnames("shrink-0 transition-transform", {
						"rotate-90": open(),
					})}
				/>
			</button>
			<Show when={open()}>
				<div class="mt-1 mb-1 ml-1.5 border-l border-border pl-4">
					<p class="whitespace-pre-wrap wrap-break-word text-xs text-subtitle">
						{props.part.question}
					</p>
					<Show when={answerText()}>
						<p class="mt-1 text-xs text-body">{answerText()}</p>
					</Show>
				</div>
			</Show>
		</div>
	);
};

export default AgentQuestion;
