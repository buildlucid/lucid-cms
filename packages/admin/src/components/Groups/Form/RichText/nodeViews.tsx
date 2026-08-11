import {
	LucidDocument,
	LucidEmbeddedBrick,
	LucidMedia,
	LucidVariable,
} from "@lucidcms/rich-text";
import type { Editor } from "@tiptap/core";
import { createSignal, type JSX, untrack } from "solid-js";
import { render } from "solid-js/web";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRichTextDocumentFieldText } from "./helpers";
import {
	DocumentNodeView,
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

const removeNode = (
	editor: Editor,
	getPos: () => number | undefined,
	nodeSize: number,
) => {
	const position = getPos();
	if (typeof position !== "number") return;
	editor.view.dispatch(
		editor.view.state.tr.delete(position, position + nodeSize),
	);
};

/** Builds editor node views for Lucid reference nodes. */
export const createRichTextNodeViewExtensions = (options?: RichTextOptions) => [
	LucidMedia.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const mediaId = node.attrs.mediaId;
				const reference =
					typeof mediaId === "number"
						? untrack(() => options?.references?.media?.(mediaId))
						: undefined;

				return renderNodeView(() => (
					<MediaNodeView
						mediaId={mediaId}
						reference={reference}
						locale={options?.locale}
						isEditable={() => editor.isEditable}
						getPos={getPos}
						setMediaId={(position, nextId) => {
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									mediaId: nextId,
									media: null,
								}),
							);
						}}
						remove={() => removeNode(editor, getPos, node.nodeSize)}
						selectMedia={options?.callbacks?.selectMedia}
						errors={() =>
							options?.validation?.getReferenceErrors?.({
								type: "rich-text-media",
								mediaId,
							}) ?? []
						}
					/>
				));
			};
		},
	}),
	LucidDocument.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const [currentNode, setCurrentNode] = createSignal(node);
				const attrs = () => currentNode().attrs;
				const reference = () => {
					const { collectionKey, documentId } = attrs();
					return typeof collectionKey === "string" &&
						typeof documentId === "number"
						? untrack(() =>
								options?.references?.document?.(collectionKey, documentId),
							)
						: undefined;
				};
				const nodeView = renderNodeView(() => (
					<DocumentNodeView
						collectionKey={attrs().collectionKey}
						documentId={attrs().documentId}
						reference={reference()}
						collections={options?.documentCollections ?? []}
						locale={options?.locale}
						isEditable={() => editor.isEditable}
						getPos={getPos}
						setDocument={(position, document) => {
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									collectionKey: document.collectionKey,
									documentId: document.id,
								}),
							);
						}}
						remove={() => removeNode(editor, getPos, currentNode().nodeSize)}
						selectDocument={options?.callbacks?.selectDocument}
						errors={() => {
							const { collectionKey, documentId } = attrs();
							return typeof collectionKey === "string" &&
								typeof documentId === "number"
								? (options?.validation?.getReferenceErrors?.({
										type: "rich-text-document",
										collectionKey,
										documentId,
									}) ?? [])
								: [];
						}}
					/>
				));

				return {
					...nodeView,
					update: (nextNode) => {
						if (nextNode.type !== node.type) return false;
						setCurrentNode(nextNode);
						return true;
					},
				};
			};
		},
	}),
	LucidVariable.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const { collectionKey, documentId, fieldKey, value } = node.attrs;
				const reference =
					typeof collectionKey === "string" && typeof documentId === "number"
						? untrack(() =>
								options?.references?.document?.(collectionKey, documentId),
							)
						: undefined;

				return renderNodeView(() => (
					<VariableNodeView
						collectionKey={collectionKey}
						documentId={documentId}
						fieldKey={fieldKey}
						value={getHydratedVariableText(value)}
						available={reference !== undefined}
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
						errors={() =>
							typeof collectionKey === "string" &&
							typeof documentId === "number" &&
							typeof fieldKey === "string"
								? (options?.validation?.getReferenceErrors?.({
										type: "rich-text-variable",
										collectionKey,
										documentId,
										fieldKey,
									}) ?? [])
								: []
						}
					/>
				));
			};
		},
	}),
	LucidEmbeddedBrick.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const refValue = node.attrs.ref;
				const brick =
					typeof refValue === "string"
						? untrack(() => options?.references?.embeddedBrick?.(refValue))
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
						remove={() => removeNode(editor, getPos, node.nodeSize)}
						editEmbeddedBrick={options?.callbacks?.editEmbeddedBrick}
						errors={() =>
							typeof refValue === "string"
								? (options?.validation?.getReferenceErrors?.({
										type: "rich-text-embedded-brick",
										ref: refValue,
									}) ?? [])
								: []
						}
					/>
				));
			};
		},
	}),
];
