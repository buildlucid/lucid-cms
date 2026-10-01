import { debounce } from "@solid-primitives/scheduled";
import { Editor } from "@tiptap/core";
import type { Agent, AgentReferenceInput } from "@types";
import classnames from "classnames";
import { FaSolidArrowUp, FaSolidStop } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	on,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import AgentReferenceFiles from "@/components/AgentReferenceFiles/AgentReferenceFiles";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import useAgentUploads from "@/hooks/useAgentUploads/useAgentUploads";
import useFirstPaint from "@/hooks/useFirstPaint/useFirstPaint";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceItem,
	agentReferenceKey,
	mergeAgentReferences,
} from "@/utils/agent-references";
import { readDraft, restoreSubmittedDraft, writeDraft } from "./draft";
import { composerExtensions, isBlank } from "./editor";
import AgentCapabilityHints from "./parts/AgentCapabilityHints";
import AgentReferenceMenu from "./parts/AgentReferenceMenu";

/** Lets a page put text into the box, such as a queued message taken back to edit. */
export interface AgentComposerHandle {
	/** Bare references are filled in from `referenceDetails` when they are known. */
	insert: (
		markdown: string,
		references?: (AgentReferenceInput | AgentReferenceItem)[],
	) => void;
	/** Attaches a resource, or removes it when it is already attached. */
	toggleReference: (
		reference: AgentReferenceInput | AgentReferenceItem,
	) => void;
	focus: () => void;
}

export interface AgentComposerProps {
	placeholder: string;
	/** The agent files are uploaded for. Uploading is off without it. */
	agentKey?: string;
	/** Resource types the add menu offers. */
	features?: Agent["features"];
	/** What the agent can do, shown on attached files and in the toolbar. */
	capabilities?: Agent["capabilities"];
	/** Current details for resources already linked to the chat, keyed by `agentReferenceKey`. */
	referenceDetails?: Readonly<Record<string, AgentReferenceItem>>;
	/** Resolves false when the message was not accepted, which puts it back in the box. */
	onSubmit: (
		text: string,
		mode: "send" | "steer",
		references: AgentReferenceItem[],
	) => boolean | Promise<boolean>;
	/** Turns the send button into a stop button while the box is empty. */
	onStop?: () => void;
	/** ↑ in an empty box. Returns false when there is nothing to take back. */
	onEditLast?: () => boolean;
	/** The agent is working: messages queue when `queueable`, and Mod + Enter steers. */
	busy?: boolean;
	queueable?: boolean;
	disabled?: boolean;
	autofocus?: boolean;
	/** Reports whether the composer is empty, including a restored draft. */
	onBlankChange?: (blank: boolean) => void;
	/**
	 * Lifts attached files out of the flow, floating them above the nearest
	 * positioned container so content scrolls behind them.
	 */
	floatAttachments?: boolean;
	/** Reports whether any files are attached, so a page can make room for them. */
	onAttachedChange?: (attached: boolean) => void;
	/** Reports the attached resources, so a page can show which ones are selected. Undefined once the box closes. */
	onReferencesChange?: (references: AgentReferenceItem[] | undefined) => void;
	/** Keeps an unsent draft for the browser session. */
	draftKey?: string;
	/** Toolbar slots along the bottom edge. `start` comes before the add menu, as it can change what the menu offers. */
	start?: JSX.Element;
	controls?: JSX.Element;
	header?: JSX.Element;
	end?: JSX.Element;
	/** @default "md" */
	size?: "md" | "lg";
	/** Pixels added to the editor's resting height, animated as it changes. */
	grow?: number;
	class?: string;
	ref?: (handle: AgentComposerHandle) => void;
}

const editorHeight = { md: "1.5rem", lg: "4.5rem" } as const;

export const composerTriggerClasses =
	"flex h-7 items-center justify-center gap-1.5 rounded-md text-xs text-subtitle fill-subtitle transition-colors hover:bg-card-hover hover:text-title hover:fill-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary";

/**
 * The message box for talking to the agent. It supports markdown formatting as
 * you type and sends markdown. Enter sends, or queues while the agent is busy;
 * Mod + Enter steers; Shift + Enter adds a line. It grows with its content, then
 * scrolls. Files dropped on it or picked from the add menu upload as the user's
 * personal media and attach once they finish.
 */
const AgentComposer: Component<AgentComposerProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editor, setEditor] = createSignal<Editor>();
	const [blank, setBlank] = createSignal(true);
	const painted = useFirstPaint();
	let container: HTMLDivElement | undefined;
	let fileInput: HTMLInputElement | undefined;
	const [submitting, setSubmitting] = createSignal(false);
	const [dragDepth, setDragDepth] = createSignal(0);
	const draft = readDraft(props.draftKey);
	const [references, setReferences] = createSignal(draft.references);
	const uploads = useAgentUploads({
		agentKey: () => props.agentKey,
		onUploaded: (reference) =>
			setReferences((current) => mergeAgentReferences(current, [reference])),
	});

	// ----------------------------------------
	// Memos
	const canUpload = createMemo(
		() =>
			props.agentKey !== undefined &&
			props.features?.media.upload === true &&
			!props.disabled,
	);
	const unsupportedReferences = createMemo(() => {
		const features = props.features;
		return (
			features !== undefined &&
			references().some((reference) =>
				reference.type === "media"
					? !(features.media.attach || features.media.upload)
					: !features.documents.attach,
			)
		);
	});

	// ----------------------------------------
	// Functions
	const updateBlank = (instance: Editor) => {
		const value = isBlank(instance) && references().length === 0;
		setBlank(value);
		props.onBlankChange?.(value);
	};
	//* the key is taken when the save is scheduled, so switching chats never mixes drafts
	const saveDraft = debounce(writeDraft, 300);
	const scheduleDraft = (key: string | undefined, instance: Editor) =>
		saveDraft(key, {
			text: instance.getMarkdown(),
			references: references(),
		});

	const hasFiles = (event: DragEvent) =>
		canUpload() &&
		Array.from(event.dataTransfer?.types ?? []).includes("Files");
	const onDragEnter = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		setDragDepth((depth) => depth + 1);
	};
	const onDragOver = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	};
	const onDragLeave = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		setDragDepth((depth) => Math.max(0, depth - 1));
	};
	const onDrop = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		setDragDepth(0);
		uploads.add(Array.from(event.dataTransfer?.files ?? []));
	};

	const submit = async (mode: "send" | "steer") => {
		const instance = editor();
		if (
			!instance ||
			submitting() ||
			props.disabled ||
			uploads.uploading() ||
			unsupportedReferences() ||
			(isBlank(instance) && references().length === 0)
		) {
			return;
		}
		if (props.busy && !props.queueable) return;

		const key = props.draftKey;
		const submitted = {
			text: instance.getMarkdown().trim(),
			references: references(),
		};
		setReferences([]);
		//* cleared straight away, and restored if the message is not accepted
		instance.commands.clearContent(true);
		saveDraft.clear();
		writeDraft(key, { text: "", references: [] });
		setSubmitting(true);
		let accepted = false;
		try {
			accepted = await props.onSubmit(
				submitted.text,
				mode === "steer" && props.busy && props.queueable ? "steer" : "send",
				submitted.references,
			);
		} finally {
			if (!accepted) {
				if (!instance.isDestroyed && props.draftKey === key) {
					const restored = restoreSubmittedDraft(submitted, {
						text: instance.getMarkdown().trim(),
						references: references(),
					});
					setReferences(restored.references);
					instance.commands.setContent(restored.text, {
						contentType: "markdown",
						emitUpdate: true,
					});
				} else {
					writeDraft(key, restoreSubmittedDraft(submitted, readDraft(key)));
				}
			}
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
					editLast: () =>
						references().length === 0 && (props.onEditLast?.() ?? false),
				},
			}),
			content: draft.text,
			contentType: "markdown",
			autofocus: false,
			editable: !props.disabled,
			editorProps: {
				attributes: {
					class:
						"agent-markdown agent-markdown-tight grow px-4 pt-4.5 pb-3.5 outline-hidden",
					style: `min-height: ${editorHeight[props.size ?? "md"]}`,
					"aria-label": T()("agent.composer.label"),
					"aria-multiline": "true",
					role: "textbox",
				},
			},
			onUpdate: ({ editor: updated }) => {
				updateBlank(updated);
				scheduleDraft(props.draftKey, updated);
			},
		});
		setEditor(instance);
		updateBlank(instance);
		props.ref?.({
			insert: (markdown, added = []) => {
				setReferences((current) =>
					mergeAgentReferences(
						current,
						added.map((reference) =>
							agentReferenceItem(reference, props.referenceDetails),
						),
					),
				);
				const joined = isBlank(instance)
					? markdown
					: `${instance.getMarkdown().trim()}\n\n${markdown}`;
				instance.commands.setContent(joined, {
					contentType: "markdown",
					emitUpdate: true,
				});
				instance.commands.focus("end");
			},
			toggleReference: (reference) => {
				const key = agentReferenceKey(reference);
				setReferences((current) =>
					current.some((item) => agentReferenceKey(item) === key)
						? current.filter((item) => agentReferenceKey(item) !== key)
						: [
								...current,
								agentReferenceItem(reference, props.referenceDetails),
							],
				);
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
				uploads.clear();
				saveDraft.clear();
				writeDraft(previous, {
					text: instance.getMarkdown(),
					references: references(),
				});
				const restored = readDraft(key);
				setReferences(restored.references);
				instance.commands.setContent(restored.text, {
					contentType: "markdown",
				});
				updateBlank(instance);
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

	createEffect(
		on(
			() => references().length > 0 || uploads.uploads().length > 0,
			(attached) => props.onAttachedChange?.(attached),
		),
	);
	createEffect(
		on(references, (current) => props.onReferencesChange?.(current)),
	);
	onCleanup(() => props.onReferencesChange?.(undefined));
	createEffect(() => {
		references();
		const instance = editor();
		if (!instance) return;
		updateBlank(instance);
		scheduleDraft(props.draftKey, instance);
	});

	//* a pending save is written rather than dropped, so leaving never loses or revives text
	onCleanup(() => {
		saveDraft.clear();
		const instance = editor();
		if (!instance) return;
		writeDraft(props.draftKey, {
			text: instance.getMarkdown(),
			references: references(),
		});
		instance.destroy();
	});

	// ----------------------------------------
	// Render
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: files can also be picked from the add menu
		<div
			class={props.class}
			onDragEnter={onDragEnter}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<input
				ref={fileInput}
				type="file"
				multiple
				class="hidden"
				tabIndex={-1}
				aria-hidden="true"
				onChange={(event) => {
					uploads.add(Array.from(event.currentTarget.files ?? []));
					event.currentTarget.value = "";
				}}
			/>
			<AgentReferenceFiles
				references={references()}
				uploads={uploads.uploads()}
				onRemoveUpload={(upload) => uploads.remove(upload.id)}
				capabilities={props.capabilities}
				class={
					props.floatAttachments
						? "pointer-events-none absolute inset-x-0 bottom-full z-10 mb-2 [&>li]:pointer-events-auto"
						: "-mx-1"
				}
				onRemove={(removed) =>
					setReferences((current) =>
						current.filter(
							(reference) =>
								agentReferenceKey(reference) !== agentReferenceKey(removed),
						),
					)
				}
			/>
			<form
				class={classnames(
					"relative rounded-2xl border bg-card shadow-sm transition-colors focus-within:border-primary",
					props.header ? "border-primary-low-border" : "border-border",
				)}
				onSubmit={(event) => {
					event.preventDefault();
					void submit("send");
				}}
			>
				<Show when={dragDepth() > 0}>
					<div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-card/90 text-sm font-medium text-title">
						{T()("agent.uploads.drop")}
					</div>
				</Show>
				<Show when={props.header}>
					<div class="overflow-hidden rounded-t-2xl">{props.header}</div>
				</Show>
				<ErrorMessage
					theme="basic"
					classes="px-4 pt-3"
					message={
						unsupportedReferences()
							? T()("agent.references.unsupported")
							: undefined
					}
				/>
				<div
					ref={container}
					class={classnames(
						"flex max-h-[min(40vh,20rem)] flex-col overflow-y-auto",
						{
							"transition-[min-height] duration-300 ease-emphasized motion-reduce:transition-none":
								props.grow !== undefined && painted(),
						},
					)}
					style={
						props.grow !== undefined
							? {
									"min-height": `calc(${editorHeight[props.size ?? "md"]} + ${props.grow}px)`,
								}
							: undefined
					}
				/>
				<div
					aria-hidden="true"
					class="pointer-events-none relative -mt-2.5 h-2.5 bg-linear-to-t from-card to-transparent"
				/>
				<div class="flex items-center gap-0.5 px-3 pb-3">
					{props.start}
					<AgentReferenceMenu
						features={props.features}
						references={references()}
						disabled={props.disabled || submitting()}
						onUpload={canUpload() ? () => fileInput?.click() : undefined}
						onSelect={(type, selected) =>
							setReferences((current) => [
								...current.filter((reference) => reference.type !== type),
								...selected,
							])
						}
					/>
					{props.controls}
					<AgentCapabilityHints capabilities={props.capabilities} />
					<div class="ms-auto flex items-center gap-0.5">
						{props.end}
						<Show
							when={!(props.onStop && blank())}
							fallback={
								<Button
									shape="circle"
									size="xs"
									variant="secondary"
									class="focus-visible:ring-inset"
									onClick={() => props.onStop?.()}
									aria-label={T()("agent.composer.stop")}
									title={T()("agent.composer.stop")}
								>
									<FaSolidStop size={10} />
								</Button>
							}
						>
							<Button
								type="submit"
								shape="circle"
								size="xs"
								class="focus-visible:ring-inset"
								disabled={
									blank() ||
									uploads.uploading() ||
									unsupportedReferences() ||
									submitting() ||
									props.disabled ||
									(props.busy && !props.queueable)
								}
								aria-label={T()(
									props.busy ? "agent.composer.queue" : "agent.composer.send",
								)}
								title={T()(
									props.busy && props.queueable
										? "agent.composer.hint.busy"
										: "agent.composer.send",
								)}
							>
								<FaSolidArrowUp size={11} />
							</Button>
						</Show>
					</div>
				</div>
			</form>
		</div>
	);
};

export default AgentComposer;
