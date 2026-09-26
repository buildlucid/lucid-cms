import { debounce } from "@solid-primitives/scheduled";
import { Editor } from "@tiptap/core";
import classnames from "classnames";
import {
	FaSolidArrowUp,
	FaSolidPaperclip,
	FaSolidPlus,
	FaSolidStop,
} from "solid-icons/fa";
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
import Menu from "@/components/Menu/Menu";
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
	/** Toolbar slots along the bottom edge. `start` comes before the add menu, as it can change what the menu offers. */
	start?: JSX.Element;
	end?: JSX.Element;
	/** @default "md" */
	size?: "md" | "lg";
	class?: string;
	ref?: (handle: AgentComposerHandle) => void;
}

const draftPrefix = "lucid:agent-draft:";

/** Matches a small outline button, for menu triggers in the toolbar. */
export const composerTriggerClasses =
	"flex h-7 items-center justify-center gap-1.5 rounded-md border border-border bg-input text-xs text-subtitle fill-subtitle transition-colors hover:border-transparent hover:bg-secondary-hover hover:text-secondary-foreground focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary";

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
			autofocus: false,
			editable: !props.disabled,
			editorProps: {
				attributes: {
					class: classnames(
						"agent-markdown agent-markdown-tight px-4 pt-3.5 pb-2.5 outline-hidden",
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
		//* a route can mount before it is shown, so focusing waits a frame for the box to be on screen
		if (props.autofocus) {
			const frame = requestAnimationFrame(() => instance.commands.focus("end"));
			onCleanup(() => cancelAnimationFrame(frame));
		}
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
		<div class={props.class}>
			<form
				class="relative rounded-2xl border border-border bg-card shadow-sm transition-colors focus-within:border-primary"
				onSubmit={(event) => {
					event.preventDefault();
					void submit("send");
				}}
			>
				<div ref={container} class="max-h-[min(40vh,20rem)] overflow-y-auto" />
				{/* long messages fade out behind the toolbar rather than stopping at a hard edge */}
				<div
					aria-hidden="true"
					class="pointer-events-none relative -mt-2.5 h-2.5 bg-linear-to-t from-card to-transparent"
				/>
				<div class="flex items-center gap-2 px-3 pb-3">
					{props.start}
					<Menu.Root placement="top-start">
						<Menu.Trigger
							class={classnames(composerTriggerClasses, "w-7")}
							aria-label={T()("agent.composer.add")}
							title={T()("agent.composer.add")}
						>
							<FaSolidPlus size={11} />
						</Menu.Trigger>
						<Menu.Content>
							{/* placeholder until skills and uploads can be added to a message */}
							<Menu.Item icon={<FaSolidPaperclip size={12} />} disabled={true}>
								{T()("agent.composer.add.files")}
							</Menu.Item>
						</Menu.Content>
					</Menu.Root>
					<Show when={props.queueable && props.busy}>
						<p class="hidden truncate pl-1 text-xs text-muted sm:block">
							{T()("agent.composer.hint.busy")}
						</p>
					</Show>
					<div class="ml-auto flex items-center gap-1.5">
						{props.end}
						<Show when={props.onStop}>
							<Button
								shape="circle"
								size="xs"
								variant="secondary"
								class="focus-visible:ring-inset"
								onClick={() => props.onStop?.()}
								aria-label={T()("agent.composer.stop")}
							>
								<FaSolidStop size={10} />
							</Button>
						</Show>
						<Button
							type="submit"
							shape="circle"
							size="xs"
							class="focus-visible:ring-inset"
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
							<FaSolidArrowUp size={11} />
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
};

export default AgentComposer;
