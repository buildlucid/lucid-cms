import { Editor } from "@tiptap/core";
import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import AgentMarkdownPill from "@/components/AgentMarkdownPill/AgentMarkdownPill";
import Field, { type FieldRootProps } from "@/components/Field/Field";
import T from "@/translations";
import { agentMarkdownExtensions } from "@/utils/agent-markdown-editor";

/** Formats instructions as you type and saves Markdown. Enter adds a paragraph or list item, and selecting text shows a formatting pill. */
const AgentRoutineInstructions: Component<
	Pick<FieldRootProps, "errors"> & {
		value: string;
		onChange: (value: string) => void;
	}
> = (props) => {
	const [editor, setEditor] = createSignal<Editor>();
	const id = "agent-routine-instructions";
	let container: HTMLDivElement | undefined;

	onMount(() => {
		setEditor(
			new Editor({
				element: container,
				extensions: agentMarkdownExtensions({
					placeholder: () => T()("agent.routine.instructions.placeholder"),
				}),
				content: props.value,
				contentType: "markdown",
				editorProps: {
					attributes: {
						id,
						class:
							"agent-markdown agent-markdown-compact min-h-48 p-3 outline-hidden",
						role: "textbox",
						"aria-label": T()("agent.routine.task.label"),
						"aria-multiline": "true",
						"aria-required": "true",
						"aria-describedby": `${id}-description`,
					},
				},
				onUpdate: ({ editor: updated }) =>
					props.onChange(updated.getMarkdown()),
			}),
		);
	});

	createEffect(() => {
		const current = editor();
		if (!current || current.getMarkdown() === props.value) return;
		current.commands.setContent(props.value, {
			contentType: "markdown",
			emitUpdate: false,
		});
	});

	onCleanup(() => editor()?.destroy());

	return (
		<Field.Root id={id} required errors={props.errors}>
			<Field.Label>{T()("agent.routine.task.label")}</Field.Label>
			<div
				ref={container}
				class="rounded-md border border-border bg-input transition-colors duration-200 focus-within:border-primary"
			/>
			<Show when={editor()}>
				{(instance) => <AgentMarkdownPill editor={instance()} />}
			</Show>
			<Field.Error />
			<Field.Description>
				{T()("agent.routine.instructions.description")}
			</Field.Description>
		</Field.Root>
	);
};

export default AgentRoutineInstructions;
