import { richTextNodeNames } from "@lucidcms/rich-text";
import type { Editor, JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
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

/** Inserts at the captured range rather than whichever selection is active later. */
const insertReferenceNode = (
	editor: Editor,
	range: ReferenceInsertionRange,
	content: JSONContent,
) => {
	editor.chain().focus().insertContentAt(range, content).run();
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
			isRichTextOptionEnabled(props.options?.media) ||
			isRichTextOptionEnabled(props.options?.documents) ||
			isRichTextVariableOptionEnabled(props.options?.variables) ||
			isRichTextOptionEnabled(props.options?.bricks),
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
