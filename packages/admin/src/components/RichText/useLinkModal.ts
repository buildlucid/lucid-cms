import type { Editor } from "@tiptap/core";
import { createSignal } from "solid-js";
import type { LinkModalState, RichTextLinkUpdate } from "./parts/LinkModal";
import type { RichTextOptions } from "./types";

type LinkAttributes = {
	href?: string;
	target?: string | null;
	kind?: "external" | "document";
	collectionKey?: string;
	documentId?: number;
};

/**
 * Drives `LinkModal` for an editor. `open` fills the modal from the selection,
 * or the whole link under the caret, and its callbacks write the result back.
 */
const useLinkModal = (config: {
	editor: () => Editor;
	options?: () => RichTextOptions | undefined;
}) => {
	// ----------------------------------------
	// State & Hooks
	const [isOpen, setIsOpen] = createSignal(false);
	const [initial, setInitial] = createSignal<
		Omit<LinkModalState, "open" | "setOpen">
	>({
		initialLabel: "",
		initialUrl: "",
		initialKind: "external",
		initialOpenInNewTab: false,
		canRemove: false,
	});
	let range: { from: number; to: number } | undefined;

	// ----------------------------------------
	// Functions
	const open = () => {
		const editor = config.editor();
		const activeLink = editor.isActive("link");
		if (activeLink) {
			editor.chain().focus().extendMarkRange("link").run();
		}
		const { from, to } = editor.state.selection;
		const attrs: LinkAttributes = editor.getAttributes("link");
		range = { from, to };
		setInitial({
			initialLabel: editor.state.doc.textBetween(from, to, " "),
			initialUrl: attrs.href ?? "",
			initialKind: attrs.kind === "document" ? "document" : "external",
			initialDocument:
				typeof attrs.collectionKey === "string" &&
				typeof attrs.documentId === "number"
					? config
							.options?.()
							?.references?.document?.(attrs.collectionKey, attrs.documentId)
					: undefined,
			initialOpenInNewTab: attrs.target === "_blank",
			canRemove: activeLink,
		});
		setIsOpen(true);
	};
	/** Selects the captured text again once the modal has handed focus back. */
	const chainAtLink = () => {
		let chain = config.editor().chain();
		if (range) chain = chain.setTextSelection(range);
		return chain.focus().extendMarkRange("link");
	};
	const remove = () => {
		setIsOpen(false);
		requestAnimationFrame(() => chainAtLink().unsetLink().run());
	};
	const update = (values: RichTextLinkUpdate) => {
		setIsOpen(false);

		requestAnimationFrame(() => {
			const chain = chainAtLink();
			const target = values.openInNewTab ? "_blank" : null;
			const rel = values.openInNewTab ? "noopener noreferrer" : null;
			let linkAttrs: {
				href: string | null;
				kind: "external" | "document";
				collectionKey: string | null;
				documentId: number | null;
				target: string | null;
				rel: string | null;
			};

			if (values.kind === "document") {
				const document = values.document;
				if (!document) {
					chain.unsetLink().run();
					return;
				}
				linkAttrs = {
					href: null,
					kind: "document",
					collectionKey: document.collectionKey,
					documentId: document.id,
					target,
					rel,
				};
			} else {
				const href = values.url.trim();
				if (!href) {
					chain.unsetLink().run();
					return;
				}
				linkAttrs = {
					href,
					kind: "external",
					collectionKey: null,
					documentId: null,
					target,
					rel,
				};
			}

			const label = values.label.trim();
			if (label) {
				chain
					.insertContent({
						type: "text",
						text: label,
						marks: [{ type: "link", attrs: linkAttrs }],
					})
					.run();
				return;
			}
			chain.setMark("link", linkAttrs).run();
		});
	};

	// ----------------------------------------
	// Return
	return {
		isOpen,
		open,
		state: (): LinkModalState => ({
			...initial(),
			open: isOpen(),
			setOpen: setIsOpen,
		}),
		callbacks: { onUpdate: update, onRemove: remove },
	};
};

export default useLinkModal;
