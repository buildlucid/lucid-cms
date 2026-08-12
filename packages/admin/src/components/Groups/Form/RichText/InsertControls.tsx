import { richTextNodeNames } from "@lucidcms/rich-text";
import type { Editor, JSONContent } from "@tiptap/core";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state";
import {
	FaSolidCompress,
	FaSolidCubes,
	FaSolidDatabase,
	FaSolidExpand,
	FaSolidFileLines,
	FaSolidImage,
	FaSolidUpload,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import {
	getRichTextVariableAttrs,
	isRichTextOptionEnabled,
	isRichTextVariableOptionEnabled,
} from "./helpers";
import ToolbarButton from "./ToolbarButton";
import type { RichTextOptions } from "./types";

type ReferenceInsertionRange = {
	from: number;
	to: number;
};

/** Captures the insertion range before an asynchronous reference picker opens. */
const getReferenceInsertionRange = (
	editor: Editor,
): ReferenceInsertionRange => {
	const selection = editor.state.selection;

	if (selection instanceof NodeSelection) {
		return { from: selection.to, to: selection.to };
	}

	return { from: selection.from, to: selection.to };
};

/** Restores a valid forward-facing caret or gap cursor at the inserted node. */
const focusReferenceInsertionEnd = (editor: Editor, position: number) => {
	requestAnimationFrame(() => {
		if (editor.isDestroyed) return;

		const resolvedPosition = editor.state.doc.resolve(
			Math.min(position, editor.state.doc.content.size),
		);
		const forwardSelection = Selection.near(resolvedPosition, 1);
		const selection = resolvedPosition.parent.inlineContent
			? TextSelection.create(editor.state.doc, resolvedPosition.pos)
			: forwardSelection instanceof TextSelection
				? forwardSelection
				: new GapCursor(resolvedPosition);

		editor.view.dispatch(
			editor.state.tr.setSelection(selection).scrollIntoView(),
		);
		editor.view.focus();
	});
};

/**
 * Inserts at the captured range and restores the caret after the new node once
 * the asynchronous picker has finished closing.
 */
const insertReferenceNode = (
	editor: Editor,
	range: ReferenceInsertionRange,
	content: JSONContent,
) => {
	let insertionEnd = range.to;
	const inserted = editor
		.chain()
		.insertContentAt(range, content)
		.command(({ tr }) => {
			insertionEnd = tr.selection.to;
			return true;
		})
		.run();
	if (!inserted) return;

	focusReferenceInsertionEnd(editor, insertionEnd);
};

const InsertControls: Component<{
	editor: Editor;
	disabled?: boolean;
	options?: RichTextOptions;
	fullscreen: boolean;
	onFullscreenChange: (fullscreen: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const hasReferenceControls = createMemo(
		() =>
			props.options?.referenceControls !== false &&
			(isRichTextOptionEnabled(props.options?.media) ||
				isRichTextOptionEnabled(props.options?.documents) ||
				isRichTextVariableOptionEnabled(props.options?.variables) ||
				isRichTextOptionEnabled(props.options?.bricks)),
	);

	// ----------------------------------------
	// Functions
	const insertMedia = (upload: boolean) => {
		const insertionRange = getReferenceInsertionRange(props.editor);
		const callback = upload
			? props.options?.callbacks?.uploadMedia
			: props.options?.callbacks?.selectMedia;
		if (!callback) return;

		const onInsert = (mediaId: number) =>
			insertReferenceNode(props.editor, insertionRange, {
				type: richTextNodeNames.media,
				attrs: { mediaId },
			});

		if (upload) {
			props.options?.callbacks?.uploadMedia?.({
				onUpload: onInsert,
			});
			return;
		}

		props.options?.callbacks?.selectMedia?.({
			onSelect: onInsert,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={hasReferenceControls()}>
				<div class="h-5 w-px bg-border" />
			</Show>
			<Show when={hasReferenceControls()}>
				<div class="flex items-center gap-1.5">
					<Show when={isRichTextOptionEnabled(props.options?.media)}>
						<ToolbarButton
							mode="default"
							isActive={false}
							onClick={() => insertMedia(false)}
							disabled={props.disabled}
							title={T()("editor.rich.text.media.select")}
						>
							<FaSolidImage size={12} />
						</ToolbarButton>
						<ToolbarButton
							mode="default"
							isActive={false}
							onClick={() => insertMedia(true)}
							disabled={props.disabled}
							title={T()("editor.rich.text.media.upload")}
						>
							<FaSolidUpload size={12} />
						</ToolbarButton>
					</Show>
					<Show when={isRichTextOptionEnabled(props.options?.documents)}>
						<ToolbarButton
							mode="default"
							isActive={false}
							onClick={() => {
								const insertionRange = getReferenceInsertionRange(props.editor);
								props.options?.callbacks?.selectDocument?.({
									collectionKeys:
										props.options?.documentNodeCollectionKeys ?? [],
									onSelect: (document) =>
										insertReferenceNode(props.editor, insertionRange, {
											type: richTextNodeNames.document,
											attrs: {
												collectionKey: document.collectionKey,
												documentId: document.id,
											},
										}),
								});
							}}
							disabled={props.disabled}
							title={T()("editor.rich.text.document.add")}
						>
							<FaSolidFileLines size={12} />
						</ToolbarButton>
					</Show>
					<Show
						when={isRichTextVariableOptionEnabled(props.options?.variables)}
					>
						<ToolbarButton
							mode="default"
							isActive={false}
							onClick={() => {
								const insertionRange = getReferenceInsertionRange(props.editor);
								props.options?.callbacks?.selectVariable?.({
									onSelect: (selection) =>
										insertReferenceNode(props.editor, insertionRange, {
											type: richTextNodeNames.variable,
											attrs: getRichTextVariableAttrs(
												selection,
												props.options?.locale,
											),
										}),
								});
							}}
							disabled={props.disabled}
							title={T()("editor.rich.text.variable.add")}
						>
							<FaSolidDatabase size={12} />
						</ToolbarButton>
					</Show>
					<Show when={isRichTextOptionEnabled(props.options?.bricks)}>
						<ToolbarButton
							mode="default"
							isActive={false}
							onClick={() => {
								const insertionRange = getReferenceInsertionRange(props.editor);
								props.options?.callbacks?.selectEmbeddedBrick?.({
									onSelect: (ref) =>
										insertReferenceNode(props.editor, insertionRange, {
											type: richTextNodeNames.embeddedBrick,
											attrs: { ref },
										}),
								});
							}}
							disabled={props.disabled}
							title={T()("editor.rich.text.brick.add")}
						>
							<FaSolidCubes size={12} />
						</ToolbarButton>
					</Show>
				</div>
			</Show>
			<Show when={props.options?.fullscreen === true}>
				<div class="ml-auto">
					<ToolbarButton
						mode="default"
						isActive={props.fullscreen}
						onClick={() => props.onFullscreenChange(!props.fullscreen)}
						disabled={props.disabled}
						title={
							props.fullscreen
								? T()("editor.rich.text.fullscreen.exit")
								: T()("editor.rich.text.fullscreen.enter")
						}
					>
						{props.fullscreen ? (
							<FaSolidCompress size={12} />
						) : (
							<FaSolidExpand size={12} />
						)}
					</ToolbarButton>
				</div>
			</Show>
		</>
	);
};

export default InsertControls;
