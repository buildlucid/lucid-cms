import classnames from "classnames";
import {
	TbOutlineArrowRight,
	TbOutlineArrowUp,
	TbOutlinePencil,
} from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	onMount,
} from "solid-js";
import AgentInteractionBar from "@/components/AgentInteractionBar/AgentInteractionBar";
import AgentMarkdown from "@/components/AgentMessage/parts/AgentMarkdown";
import Button from "@/components/Button/Button";
import T from "@/translations";

export interface AgentQuestionPanelProps {
	question: {
		question: string;
		options?: string[];
	};
	onAnswer: (answer: string) => Promise<boolean>;
	onSubmit: (text: string) => Promise<boolean>;
	onStop?: () => void;
	class?: string;
}

/**
 * Takes the chat box's place while the agent waits on the user. The question
 * sits in a tinted strip across the top; below it, choices are listed with the
 * first highlighted, and anything else can be typed under them.
 * With the text box empty, ↑ and ↓ move the highlight and Enter picks it. Once
 * something is typed, Enter sends it and Shift + Enter adds a line.
 */
const AgentQuestionPanel: Component<AgentQuestionPanelProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();
	const [text, setText] = createSignal("");
	const [active, setActive] = createSignal(0);
	const [submitting, setSubmitting] = createSignal(false);
	let input: HTMLTextAreaElement | undefined;

	// ----------------------------------------
	// Memos
	const choices = createMemo(() =>
		(props.question.options ?? []).map((value) => ({ value, label: value })),
	);
	const blank = createMemo(() => text().trim().length === 0);
	const placeholder = createMemo(() => {
		return choices().length
			? T()("agent.question.other")
			: T()("agent.composer.placeholder.answer");
	});

	// ----------------------------------------
	// Functions
	const resize = () => {
		if (!input) return;
		input.style.height = "auto";
		input.style.height = `${input.scrollHeight}px`;
	};
	/** Runs one answer at a time. */
	const run = async (send: () => Promise<boolean>) => {
		if (submitting()) return;
		setSubmitting(true);
		try {
			return await send();
		} finally {
			setSubmitting(false);
		}
	};
	const choose = (index: number) => {
		const choice = choices()[index];
		if (choice) void run(() => props.onAnswer(choice.value));
	};
	/** A typed answer the agent did not accept goes back in the box. */
	const submit = async () => {
		const value = text().trim();
		if (!value) return;
		setText("");
		resize();
		const accepted = await run(() => props.onSubmit(value));
		if (accepted === false && blank()) {
			setText(value);
			resize();
		}
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.isComposing) return;
		const count = choices().length;
		if (blank() && count && event.key === "ArrowDown") {
			event.preventDefault();
			setActive((index) => (index + 1) % count);
		} else if (blank() && count && event.key === "ArrowUp") {
			event.preventDefault();
			setActive((index) => (index - 1 + count) % count);
		} else if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (blank()) choose(active());
			else void submit();
		}
	};

	// ----------------------------------------
	// Effects
	//* the box appears when the question does, so typing carries straight on into it
	onMount(() => input?.focus());

	// ----------------------------------------
	// Render
	return (
		<section
			aria-labelledby={`${id}-question`}
			aria-busy={submitting()}
			class={classnames(
				//* a primary edge marks that the agent is waiting on an answer, and turns solid on focus like the chat box
				"overflow-hidden rounded-2xl border border-primary-low-border bg-card shadow-sm transition-colors focus-within:border-primary",
				props.class,
			)}
		>
			<AgentInteractionBar
				id={`${id}-question`}
				title={
					<AgentMarkdown
						text={props.question.question}
						class="text-sm leading-6 text-subtitle"
					/>
				}
				onStop={props.onStop}
			/>

			<div class="px-2 pt-2 pb-2">
				<ul
					class="flex flex-col gap-0.5"
					aria-label={T()("agent.question.choices")}
				>
					<For each={choices()}>
						{(choice, index) => (
							<li>
								<button
									type="button"
									disabled={submitting()}
									class={classnames(
										"flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-start transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60",
										{ "bg-card-hover": active() === index() },
									)}
									aria-current={active() === index() || undefined}
									onPointerEnter={() => setActive(index())}
									onFocus={() => setActive(index())}
									onClick={() => choose(index())}
								>
									<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-input text-xs text-muted tabular-nums">
										{index() + 1}
									</span>
									<span class="min-w-0 grow wrap-break-words text-sm text-title">
										{choice.label}
									</span>
									<TbOutlineArrowRight
										size={12}
										class={classnames("me-1 shrink-0 text-muted", {
											invisible: active() !== index(),
										})}
									/>
								</button>
							</li>
						)}
					</For>
				</ul>

				<form
					//* the icons sit on the last line, so they stay put as a long answer grows
					class={classnames("flex items-end gap-3 px-2 py-1.5", {
						"mt-1": choices().length,
					})}
					onSubmit={(event) => {
						event.preventDefault();
						void submit();
					}}
				>
					<span
						aria-hidden="true"
						class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted"
					>
						<TbOutlinePencil size={10} />
					</span>
					<textarea
						ref={input}
						rows={1}
						value={text()}
						disabled={submitting()}
						aria-label={placeholder()}
						placeholder={placeholder()}
						class="max-h-40 min-h-7 grow resize-none bg-transparent py-1 text-sm leading-5 text-title outline-hidden placeholder:text-muted"
						onInput={(event) => {
							setText(event.currentTarget.value);
							resize();
						}}
						onKeyDown={onKeyDown}
					/>
					<Button
						type="submit"
						shape="circle"
						size="xs"
						class="focus-visible:ring-inset"
						disabled={blank() || submitting()}
						aria-label={T()("agent.composer.send")}
					>
						<TbOutlineArrowUp size={11} />
					</Button>
				</form>
			</div>
		</section>
	);
};

export default AgentQuestionPanel;
