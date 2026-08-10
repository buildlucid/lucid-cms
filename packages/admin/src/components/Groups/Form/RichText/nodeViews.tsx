import {
	LucidEmbeddedBrick,
	LucidMedia,
	LucidVariable,
} from "@lucidcms/rich-text";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRichTextDocumentFieldText, getRichTextMediaTypes } from "./helpers";
import {
	EmbeddedBrickNodeView,
	MediaNodeView,
	VariableNodeView,
} from "./Nodes";
import type { RichTextOptions } from "./types";

/** Mounts a single-root Solid component and exposes it as a Tiptap node view. */
const renderNodeView = (view: () => JSX.Element) => {
	const mount = document.createElement("div");
	const dispose = render(view, mount);
	const dom = mount.firstElementChild;

	if (!(dom instanceof HTMLElement)) {
		dispose();
		throw new Error("Rich-text node views must render an HTML element root.");
	}

	//* Tiptap owns the root element's placement; Solid continues to own its subtree.
	dom.remove();
	return { dom, destroy: dispose };
};

const getHydratedVariableText = (value: unknown): string => {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	if (typeof value === "boolean") {
		return value ? T()("common.yes") : T()("common.no");
	}
	return "";
};

/** Builds editor node views for Lucid reference nodes. */
export const createRichTextNodeViewExtensions = (options?: RichTextOptions) => [
	LucidMedia.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const mediaId = node.attrs.mediaId;
				const reference =
					typeof mediaId === "number"
						? options?.references?.media?.(mediaId)
						: undefined;

				return renderNodeView(() => (
					<MediaNodeView
						mediaId={mediaId}
						reference={reference}
						locale={options?.locale}
						isEditable={() => editor.isEditable}
						allowedTypes={getRichTextMediaTypes(options?.media)}
						getPos={getPos}
						setMediaId={(position, nextId) => {
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									mediaId: nextId,
									media: null,
								}),
							);
						}}
						selectMedia={options?.callbacks?.selectMedia}
					/>
				));
			};
		},
	}),
	LucidVariable.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const { collectionKey, documentId, fieldKey, value } = node.attrs;

				return renderNodeView(() => (
					<VariableNodeView
						collectionKey={collectionKey}
						documentId={documentId}
						fieldKey={fieldKey}
						value={getHydratedVariableText(value)}
						isEditable={() => editor.isEditable}
						getPos={getPos}
						setSelection={(position, selection) => {
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									collectionKey: selection.collectionKey,
									documentId: selection.documentId,
									fieldKey: selection.fieldKey,
									value: getRichTextDocumentFieldText(
										selection.document,
										selection.fieldKey,
										options?.locale,
									),
								}),
							);
						}}
						selectVariable={options?.callbacks?.selectVariable}
					/>
				));
			};
		},
	}),
	LucidEmbeddedBrick.extend({
		addNodeView() {
			return ({ node, editor }) => {
				const refValue = node.attrs.ref;
				const brick =
					typeof refValue === "string"
						? options?.references?.embeddedBrick?.(refValue)
						: undefined;
				const config = options?.embeddedBrickConfigs?.find(
					(item) => item.key === brick?.key,
				);
				const available = brick !== undefined && config !== undefined;
				const label = available
					? helpers.getLocaleValue({
							value: config.details.name,
							fallback: brick.key,
						})
					: "";
				const description = available
					? helpers.getLocaleValue({ value: config.details.summary })
					: "";

				return renderNodeView(() => (
					<EmbeddedBrickNodeView
						refValue={refValue}
						available={available}
						label={label}
						description={description}
						isEditable={() => editor.isEditable}
						editEmbeddedBrick={options?.callbacks?.editEmbeddedBrick}
					/>
				));
			};
		},
	}),
];
