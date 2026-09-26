import { debounce } from "@solid-primitives/scheduled";
import { Editor } from "@tiptap/core";
import classnames from "classnames";
import { FaSolidArrowUp, FaSolidStop } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";
import { composerExtensions, isBlank } from "./editor";

/** Lets a page put text into the box, such as a queued message taken back to edit. */
export interface AgentComposerHandle {
	insert: (markdown: string) => void;
	focus: () => void;
}

export interface AgentComposerProps {
	placeholder: string;
	/** Resolves false when the message was not accepted, which puts it back in the box. */
	onSubmit: (
		text: string,
		mode: "send" | "steer",
	) => boolean | Promise<boolean>;
	/** Shows a stop button. */
	onStop?: () => void;
	/** ↑ in an empty box. Returns false when there is nothing to take back. */
	onEditLast?: () => boolean;
	/** The agent is working: messages queue when `queueable`, and Mod + Enter steers. */
	busy?: boolean;
	queueable?: boolean;
	disabled?: boolean;
	autofocus?: boolean;
	/** Keeps an unsent draft for the browser session. */
	draftKey?: string;
	/** Attached to the top edge, such as queued messages. */
	top?: JSX.Element;
	/** Toolbar slots along the bottom edge. */
	start?: JSX.Element;
	end?: JSX.Element;
	/** @default "md" */
	size?: "md" | "lg";
	class?: string;
	ref?: (handle: AgentComposerHandle) => void;
}

const draftPrefix = "lucid:agent-draft:";

//* storage can be unavailable, such as in a private window
const readDraft = (key?: string) => {
	if (!key) return "";
	try {
		return sessionStorage.getItem(draftPrefix + key) ?? "";
	} catch {
		return "";
	}
};

const writeDraft = (key: string | undefined, markdown: string) => {
	if (!key) return;
	try {
		if (markdown) sessionStorage.setItem(draftPrefix + key, markdown);
		else sessionStorage.removeItem(draftPrefix + key);
	} catch {}
};

/**
 * The message box for talking to the agent. It supports markdown formatting as
 * you type and sends markdown. Enter sends, or queues while the agent is busy;
 * Mod + Enter steers; Shift + Enter adds a line. It grows with its content, then
 * scrolls.
 */
const AgentComposer: Component<AgentComposerProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editor, setEditor] = createSignal<Editor>();
	const [blank, setBlank] = createSignal(true);
	let container: HTMLDivElement | undefined;
	const [submitting, setSubmitting] = createSignal(false);
	//* the key is taken when the save is scheduled, so switching chats never mixes drafts
	const saveDraft = debounce(
		(key: string | undefined, instance: Editor) =>
			writeDraft(key, instance.getMarkdown()),
		300,
	);

	// ----------------------------------------
	// Functions
	const submit = async (mode: "send" | "steer") => {
		const instance = editor();
		if (!instance || submitting() || props.disabled || isBlank(instance)) {
			return;
		}
		if (props.busy && !props.queueable) return;

		const text = instance.getMarkdown().trim();
		//* cleared straight away, and restored if the message is not accepted
		instance.commands.clearContent(true);
		//* the saved draft goes now, not after the debounce, so sent text never comes back
		saveDraft.clear();
		writeDraft(props.draftKey, "");
		setSubmitting(true);
		try {
			const accepted = await props.onSubmit(
				text,
				mode === "steer" && props.busy && props.queueable ? "steer" : "send",
			);
			if (accepted === false && isBlank(instance)) {
				instance.commands.setContent(text, {
					contentType: "markdown",
					emitUpdate: true,
				});
			}
		} finally {
			setSubmitting(false);
		}
	};

	// ----------------------------------------
	// Effects
	//* created once on mount, which never re-runs; TipTap reads props such as the
	//* placeholder while building, so a tracking scope would rebuild it on every change
	onMount(() => {
		const instance = new Editor({
			element: container,
			extensions: composerExtensions({
				placeholder: () => props.placeholder,
				keys: {
					submit: (mode) => void submit(mode),
					editLast: () => props.onEditLast?.() ?? false,
				},
			}),
			content: readDraft(props.draftKey),
			contentType: "markdown",
			autofocus: props.autofocus ? "end" : false,
			editable: !props.disabled,
			editorProps: {
				attributes: {
					class: classnames(
						"agent-markdown agent-markdown-tight px-4 pt-3.5 pb-2 leading-6 outline-hidden",
						props.size === "lg" ? "min-h-18" : "min-h-6",
					),
					"aria-label": T()("agent.composer.label"),
					"aria-multiline": "true",
					role: "textbox",
				},
			},
			onUpdate: ({ editor: updated }) => {
				setBlank(isBlank(updated));
				saveDraft(props.draftKey, updated);
			},
		});
		setEditor(instance);
		setBlank(isBlank(instance));
		props.ref?.({
			insert: (markdown) => {
				const joined = isBlank(instance)
					? markdown
					: `${instance.getMarkdown().trim()}\n\n${markdown}`;
				instance.commands.setContent(joined, {
					contentType: "markdown",
					emitUpdate: true,
				});
				instance.commands.focus("end");
			},
			focus: () => instance.commands.focus("end"),
		});
	});
	createEffect(
		on(
			() => props.draftKey,
			(key, previous) => {
				const instance = editor();
				if (!instance) return;
				saveDraft.clear();
				writeDraft(previous, instance.getMarkdown());
				instance.commands.setContent(readDraft(key), {
					contentType: "markdown",
				});
				setBlank(isBlank(instance));
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			() => props.disabled,
			(disabled) => editor()?.setEditable(!disabled),
			{ defer: true },
		),
	);
	//* placeholders are decorations, so they only redraw on a transaction
	createEffect(
		on(
			() => props.placeholder,
			() => {
				const instance = editor();
				instance?.view.dispatch(instance.state.tr);
			},
			{ defer: true },
		),
	);

	//* a pending save is written rather than dropped, so leaving never loses or revives text
	onCleanup(() => {
		saveDraft.clear();
		const instance = editor();
		if (!instance) return;
		writeDraft(props.draftKey, instance.getMarkdown());
		instance.destroy();
	});

	// ----------------------------------------
	// Render
	return (
		<div class={classnames("flex flex-col", props.class)}>
			{props.top}
			<form
				class="relative rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary-low-border"
				onSubmit={(event) => {
					event.preventDefault();
					void submit("send");
				}}
			>
				<div
					ref={container}
					class="max-h-[min(40vh,20rem)] overflow-y-auto text-sm"
				/>
				<div class="flex items-center gap-2 px-3 pb-3">
					<Show
						when={props.start}
						fallback={
							<p class="hidden pl-1 text-xs text-muted sm:block">
								{T()(
									props.queueable && props.busy
										? "agent.composer.hint.busy"
										: "agent.composer.hint",
								)}
							</p>
						}
					>
						{props.start}
					</Show>
					<div class="ml-auto flex items-center gap-1.5">
						{props.end}
						<Show when={props.onStop}>
							<Button
								shape="circle"
								size="sm"
								variant="secondary"
								onClick={() => props.onStop?.()}
								aria-label={T()("agent.composer.stop")}
							>
								<FaSolidStop />
							</Button>
						</Show>
						<Button
							type="submit"
							shape="circle"
							size="sm"
							disabled={
								blank() ||
								submitting() ||
								props.disabled ||
								(props.busy && !props.queueable)
							}
							aria-label={T()(
								props.busy ? "agent.composer.queue" : "agent.composer.send",
							)}
						>
							<FaSolidArrowUp />
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
};

export default AgentComposer;
