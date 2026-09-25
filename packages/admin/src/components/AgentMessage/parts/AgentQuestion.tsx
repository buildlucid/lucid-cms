import type { AgentApprovalAnswer, AgentMessagePart } from "@types";
import { FaSolidCircleQuestion, FaSolidShieldHalved } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

type QuestionPart = Extract<AgentMessagePart, { type: "question" }>;

/**
 * A question or approval the agent paused on. While it is pending, options can
 * be chosen directly; free-text answers go through the composer.
 */
const AgentQuestion: Component<{
	part: QuestionPart;
	pending: boolean;
	onAnswer?: (answer: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const approval = createMemo(() => props.part.kind === "approval");
	const options = createMemo(() => {
		if (!approval()) {
			return (props.part.options ?? []).map((value) => ({
				value,
				label: value,
				primary: true,
			}));
		}
		const answers: { value: AgentApprovalAnswer; label: string }[] = [
			{ value: "approve", label: T()("agent.question.approve") },
			{ value: "deny", label: T()("agent.question.deny") },
		];
		return answers.map((answer) => ({
			...answer,
			primary: answer.value === "approve",
		}));
	});
	const answerText = createMemo(() => {
		const answer = props.part.answer;
		if (answer === undefined) return undefined;
		if (!approval()) return T()("agent.question.answered", { answer });
		return answer === ("approve" satisfies AgentApprovalAnswer)
			? T()("agent.question.approved")
			: T()("agent.question.denied");
	});

	// ----------------------------------------
	// Render
	return (
		<div class="rounded-md border border-primary-low-border bg-primary-low p-4">
			<div class="flex items-start gap-3">
				<span class="mt-0.5 text-primary">
					<Show when={approval()} fallback={<FaSolidCircleQuestion />}>
						<FaSolidShieldHalved />
					</Show>
				</span>
				<div class="min-w-0 grow">
					<p class="text-xs font-medium uppercase tracking-wide text-subtitle">
						{approval()
							? T()("agent.question.approval")
							: T()("agent.question.title")}
					</p>
					<p class="mt-1 whitespace-pre-wrap break-words text-sm text-title">
						{props.part.question}
					</p>
					<Show
						when={props.pending}
						fallback={
							<Show when={answerText()}>
								<p class="mt-2 text-sm text-body">{answerText()}</p>
							</Show>
						}
					>
						<Show when={options().length}>
							<div class="mt-3 flex flex-wrap gap-2">
								<For each={options()}>
									{(option) => (
										<Button
											size="sm"
											variant={option.primary ? "primary" : "outline"}
											onClick={() => props.onAnswer?.(option.value)}
										>
											{option.label}
										</Button>
									)}
								</For>
							</div>
						</Show>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default AgentQuestion;
