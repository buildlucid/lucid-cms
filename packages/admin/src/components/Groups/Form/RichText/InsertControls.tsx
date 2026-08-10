import { richTextNodeNames } from "@lucidcms/rich-text";
import type { Editor, JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
	FaSolidCompress,
	FaSolidCubes,
	FaSolidDatabase,
	FaSolidExpand,
	FaSolidImage,
	FaSolidUpload,
} from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import T from "@/translations";
import { getRichTextMediaTypes, isRichTextOptionEnabled } from "./helpers";
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
				allowedTypes: getRichTextMediaTypes(props.options?.media),
				onUpload: onInsert,
			});
			return;
		}

		props.options?.callbacks?.selectMedia?.({
			allowedTypes: getRichTextMediaTypes(props.options?.media),
			onSelect: onInsert,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Show
			when={
				isRichTextOptionEnabled(props.options?.media) ||
				isRichTextOptionEnabled(props.options?.variables) ||
				isRichTextOptionEnabled(props.options?.bricks) ||
				props.options?.fullscreen === true
			}
		>
			<div class="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
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
				<Show when={isRichTextOptionEnabled(props.options?.variables)}>
					<ToolbarButton
						mode="default"
						isActive={false}
						onClick={() => {
							const insertionRange = getReferenceInsertionRange(props.editor);
							props.options?.callbacks?.selectVariable?.({
								onSelect: (selection) =>
									insertReferenceNode(props.editor, insertionRange, {
										type: richTextNodeNames.variable,
										attrs: {
											collectionKey: selection.collectionKey,
											documentId: selection.documentId,
											fieldKey: selection.fieldKey,
										},
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
			</div>
		</Show>
	);
};

export default InsertControls;
