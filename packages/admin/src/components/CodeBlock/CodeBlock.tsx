import { EditorState, Prec } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import classnames from "classnames";
import { createCodeMirror } from "solid-codemirror";
import { TbOutlineCheck, TbOutlineCopy } from "solid-icons/tb";
import { type Component, createEffect, on, Show } from "solid-js";
import Button from "@/components/Button/Button";
import createCodeAppearance from "@/components/CodeEditor/utils/create-code-appearance";
import { createCopy } from "@/components/Copy/copyValue";
import T from "@/translations";

export interface CodeBlockProps {
	value: string;
	/** Such as "html" or "typescript". Unknown languages show as plain text. */
	language: string;
	/** Shows a copy button at the top right on hover. @default true */
	copy?: boolean;
	/** Applied to the block. Set a `max-h-*` or height to scroll long code. */
	class?: string;
}

/**
 * Read-only code with syntax highlighting and a copy button, such as snippets for developers.
 *
 * @example
 * ```tsx
 * import { CodeBlock } from "@lucidcms/admin/components";
 *
 * return <CodeBlock language="html" value={markup()} class="max-h-96" />;
 * ```
 */
const CodeBlock: Component<CodeBlockProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [copied, copy] = createCopy(() => props.value);

	// ----------------------------------------
	// CodeMirror
	const { ref, editorView, createExtension } = createCodeMirror({
		value: props.value,
	});
	createExtension([
		EditorState.readOnly.of(true),
		EditorView.editable.of(false),
		lineNumbers(),
		//* the block sets the size, in place of the editor's own height cap
		Prec.highest(
			EditorView.theme({ "&": { height: "100%", maxHeight: "none" } }),
		),
	]);
	createCodeAppearance({
		editorView,
		createExtension,
		language: () => props.language,
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on([editorView, () => props.value], ([view, value]) => {
			if (!view) return;
			const current = view.state.doc.toString();
			if (current === value) return;
			view.dispatch({
				changes: { from: 0, to: current.length, insert: value },
			});
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			data-code-block
			class={classnames(
				"group relative flex flex-col overflow-hidden rounded-md border border-border bg-input",
				props.class,
			)}
		>
			{/* fills a block given a height, and scrolls once the code outgrows a max height */}
			<div ref={ref} class="scrollbar min-h-0 flex-1 overflow-auto" />
			<Show when={props.copy !== false}>
				<div class="absolute end-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
					<Button
						type="button"
						variant="outline"
						size="xs"
						shape="square"
						tooltip={T()("common.copy")}
						aria-label={T()("common.copy")}
						onClick={() => void copy()}
					>
						<Show when={copied()} fallback={<TbOutlineCopy size={12} />}>
							<TbOutlineCheck size={12} class="text-success" />
						</Show>
					</Button>
				</div>
			</Show>
		</div>
	);
};

export default CodeBlock;
