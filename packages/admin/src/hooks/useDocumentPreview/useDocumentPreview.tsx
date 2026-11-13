import type { PreviewTarget } from "@lucidcms/types";
import {
	type Accessor,
	createContext,
	createMemo,
	createSignal,
	type JSX,
	onCleanup,
	type ParentComponent,
	useContext,
} from "solid-js";
import type {
	DocumentPreviewHandle,
	PreviewPage,
	PreviewToolbarItemKey,
} from "@/components/DocumentPreview/types";
import type { BuilderPreview } from "@/hooks/useBuilderPreview/useBuilderPreview";
import type { PreviewStructureChange } from "@/hooks/usePreviewStructure/usePreviewStructure";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";

/** A built-in toolbar item, shown while the part that adds it is mounted. */
export type PreviewToolbarItem = {
	key: PreviewToolbarItemKey;
	render: () => JSX.Element;
};

type DocumentPreviewContextValue = {
	preview: BuilderPreview;
	open: Accessor<boolean>;
	editMode: Accessor<boolean>;
	setEditMode: (editMode: boolean) => void;
	toolbarItems: Accessor<PreviewToolbarItem[]>;
	/** Shows built-in toolbar items until the calling part unmounts. */
	addToolbarItems: (items: PreviewToolbarItem[]) => void;
	page: Accessor<PreviewPage | undefined>;
	/** Shares the live page until the calling frame unmounts. */
	showPage: (page: PreviewPage) => void;
};

const DocumentPreviewContext = createContext<DocumentPreviewContextValue>();

/** Shares the preview's state with its parts, its toolbar and the slots rendered in them. */
export const DocumentPreviewProvider: ParentComponent<{
	preview: BuilderPreview;
	open: Accessor<boolean>;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { document } = props.preview;
	const [toolbarItems, setToolbarItems] = createSignal<PreviewToolbarItem[]>(
		[],
	);
	const [page, setPage] = createSignal<PreviewPage>();

	// ----------------------------------------
	// Memos
	const editMode = createMemo(
		() =>
			userPreferencesStore.getCollectionPreviewEditing(
				document.collectionKey(),
			) ?? true,
	);

	// ----------------------------------------
	// Render
	return (
		<DocumentPreviewContext.Provider
			value={{
				preview: props.preview,
				open: props.open,
				editMode,
				setEditMode: (next) =>
					userPreferencesStore.setCollectionPreviewEditing(
						document.collectionKey(),
						next,
					),
				toolbarItems,
				addToolbarItems: (items) => {
					setToolbarItems((current) => [...current, ...items]);
					onCleanup(() =>
						setToolbarItems((current) =>
							current.filter((item) => !items.includes(item)),
						),
					);
				},
				page,
				showPage: (next) => {
					setPage(next);
					onCleanup(() => {
						if (page() === next) setPage(undefined);
					});
				},
			}}
		>
			{props.children}
		</DocumentPreviewContext.Provider>
	);
};

/** The preview's shared state, for the parts of the preview itself. */
export const usePreviewContext = () => {
	const context = useContext(DocumentPreviewContext);
	if (!context) {
		throw new Error(
			"useDocumentPreview() and PreviewFrame only work inside the document preview, eg. in a preview or preview toolbar slot.",
		);
	}
	return context;
};

/**
 * The open document's preview, for preview and preview toolbar slots and the components they
 * render. Its properties stay current as the preview changes. Build targets from
 * `useDocumentEditor()`'s `collectionKey`, `documentId` and bricks.
 *
 * @example
 * ```tsx
 * import { useDocumentPreview } from "@lucidcms/admin/hooks";
 * import type { SlotComponent } from "@lucidcms/admin/types";
 * import type wordCount from "./config.js";
 *
 * const WordCount: SlotComponent<typeof wordCount> = () => {
 * 	// ----------------------------------------
 * 	// State & Hooks
 * 	const preview = useDocumentPreview();
 * 	const [words, setWords] = createSignal<number>();
 *
 * 	// ----------------------------------------
 * 	// Effects
 * 	//* reads the page again whenever it loads or shows new edits
 * 	createEffect(
 * 		on(
 * 			() => preview.page?.revision,
 * 			async () => {
 * 				const html = await preview.page?.html();
 * 				const page = html ? new DOMParser().parseFromString(html, "text/html") : null;
 * 				setWords(page?.body.innerText.split(/\s+/).filter(Boolean).length);
 * 			},
 * 		),
 * 	);
 *
 * 	// ----------------------------------------
 * 	// Render
 * 	return <span>{words() ?? "–"} words</span>;
 * };
 * ```
 */
export const useDocumentPreview = (): DocumentPreviewHandle => {
	const context = usePreviewContext();
	const { preview } = context;
	const change = (target: PreviewTarget, next: PreviewStructureChange) =>
		preview.structure.handle(target, next) !== null;

	return {
		get editMode() {
			return context.editMode();
		},
		setEditMode: context.setEditMode,
		get canEdit() {
			return preview.canEdit();
		},
		get canChangeStructure() {
			return preview.canChangeStructure();
		},
		focus: (target) => void preview.focus.requestTarget(target),
		structure: {
			add: (target, place, brickKey) =>
				change(target, { action: "add", place, brickKey }),
			move: (target, place, anchor) =>
				change(target, { action: "move", place, anchor }),
			remove: (target) => change(target, { action: "remove" }),
		},
		get page() {
			return context.page();
		},
	};
};
