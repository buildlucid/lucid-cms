import classnames from "classnames";
import { FaSolidArrowUp, FaSolidStop } from "solid-icons/fa";
import { type Component, createSignal, onMount, Show } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

export interface AgentComposerProps {
	placeholder: string;
	onSubmit: (text: string) => void;
	/** Shows a stop button while the agent is working. */
	onStop?: () => void;
	busy?: boolean;
	disabled?: boolean;
	autofocus?: boolean;
	/** @default "md" */
	size?: "md" | "lg";
	class?: string;
}

const maxHeight = 240;

/** The message box for talking to the agent. Enter sends, Shift + Enter adds a line. */
const AgentComposer: Component<AgentComposerProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [draft, setDraft] = createSignal("");
	let textarea: HTMLTextAreaElement | undefined;

	// ----------------------------------------
	// Functions
	const resize = () => {
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
	};
	const submit = () => {
		const text = draft().trim();
		if (!text || props.busy || props.disabled) return;
		props.onSubmit(text);
		setDraft("");
		queueMicrotask(resize);
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		if (props.autofocus) textarea?.focus();
	});

	// ----------------------------------------
	// Render
	return (
		<form
			class={classnames(
				"rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary-low-border",
				props.class,
			)}
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<textarea
				ref={textarea}
				value={draft()}
				rows={props.size === "lg" ? 3 : 1}
				placeholder={props.placeholder}
				aria-label={props.placeholder}
				disabled={props.disabled}
				class={classnames(
					"block w-full resize-none bg-transparent px-4 pt-3.5 text-sm leading-6 text-title outline-hidden placeholder:text-muted disabled:cursor-not-allowed",
					props.size === "lg" ? "min-h-24" : "min-h-10",
				)}
				onInput={(event) => {
					setDraft(event.currentTarget.value);
					resize();
				}}
				onKeyDown={(event) => {
					if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
						return;
					}
					event.preventDefault();
					submit();
				}}
			/>
			<div class="flex items-center justify-between gap-3 px-3 pb-3">
				<p class="hidden pl-1 text-xs text-muted sm:block">
					{T()("agent.composer.hint")}
				</p>
				<Show
					when={props.busy && props.onStop}
					fallback={
						<Button
							type="submit"
							shape="circle"
							size="sm"
							class="ml-auto"
							disabled={!draft().trim() || props.busy || props.disabled}
							aria-label={T()("agent.composer.send")}
						>
							<FaSolidArrowUp />
						</Button>
					}
				>
					<Button
						shape="circle"
						size="sm"
						variant="secondary"
						class="ml-auto"
						onClick={() => props.onStop?.()}
						aria-label={T()("agent.composer.stop")}
					>
						<FaSolidStop />
					</Button>
				</Show>
			</div>
		</form>
	);
};

export default AgentComposer;
