import type { Collection, DocumentRef, FieldError } from "@types";
import classNames from "classnames";
import { FaSolidFileLines } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import { resolveFieldErrorMessage } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import type { RichTextOptions } from "../types";
import NodeActions from "./NodeActions";

export interface DocumentNodeViewProps {
	collectionKey: unknown;
	documentId: unknown;
	reference?: DocumentRef;
	collections: Collection[];
	locale?: string;
	isEditable: () => boolean;
	getPos: () => number | undefined;
	setDocument: (position: number, document: DocumentRef) => void;
	remove: () => void;
	selectDocument?: NonNullable<RichTextOptions["callbacks"]>["selectDocument"];
	errors: Accessor<FieldError[]>;
}

const DocumentNodeView: Component<DocumentNodeViewProps> = (props) => {
	// ----------------------------------------
	// Memos
	const collection = createMemo(() =>
		typeof props.collectionKey === "string"
			? props.collections.find((item) => item.key === props.collectionKey)
			: undefined,
	);
	const available = createMemo(
		() => props.reference !== undefined && collection() !== undefined,
	);
	const hasErrors = createMemo(() => props.errors().length > 0);
	const errorMessage = createMemo(() => {
		const message = props.errors()[0]?.message;
		return message ? resolveFieldErrorMessage(message) : undefined;
	});
	const label = createMemo(() =>
		getDocumentPreviewLabel({
			collection: collection(),
			document: props.reference,
			contentLocale: props.locale ?? "",
		}),
	);
	const collectionLabel = createMemo(() =>
		helpers.getLocaleValue({
			value: collection()?.details.singularName,
			fallback:
				typeof props.collectionKey === "string"
					? props.collectionKey
					: T()("common.document"),
		}),
	);

	// ----------------------------------------
	// Functions
	const editDocument = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (!props.isEditable()) return;

		const position = props.getPos();
		if (typeof position !== "number") return;

		props.selectDocument?.({
			collectionKeys: props.collections.map((item) => item.key),
			current: props.reference,
			onSelect: (document) => {
				props.setDocument(position, document);
			},
		});
	};

	// ----------------------------------------
	// Render
	return (
		<div
			contentEditable={false}
			class={classNames(
				"group my-3 flex w-full select-none items-center gap-3 rounded-xl border bg-card-base p-3 text-left transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary-muted-border [&.ProseMirror-selectednode]:border-primary-base [&.ProseMirror-selectednode]:ring-2 [&.ProseMirror-selectednode]:ring-primary-base/20",
				{
					"border-border": available() && !hasErrors(),
					"border-error-base/50 bg-linear-to-b from-error-base/10 to-card-base to-30%":
						!available() || hasErrors(),
				},
			)}
			data-lucid-rich-text-document=""
		>
			<div
				class={classNames(
					"flex min-h-20 min-w-0 grow items-center gap-4 rounded-xl border bg-input-base px-5 py-4",
					{
						"border-border": available() && !hasErrors(),
						"border-error-base/50": !available() || hasErrors(),
					},
				)}
			>
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card-base text-icon-base">
					<FaSolidFileLines size={18} />
				</div>
				<div class="min-w-0 grow">
					<Show
						when={available()}
						fallback={
							<span class="text-xs font-medium text-error-base">
								{errorMessage() ?? T()("editor.rich.text.document.unavailable")}
							</span>
						}
					>
						<p class="truncate text-sm font-medium text-title mb-0!">
							{label()}
						</p>
						<p class="mt-1 truncate text-xs text-subtitle mb-0!">
							{collectionLabel()} · #{String(props.documentId ?? "?")}
						</p>
						<Show when={errorMessage()}>
							{(message) => (
								<p class="mt-2 text-xs font-medium text-error-base mb-0!">
									{message()}
								</p>
							)}
						</Show>
					</Show>
				</div>
			</div>
			<NodeActions
				editLabel={T()("editor.rich.text.document.edit")}
				removeLabel={T()("editor.rich.text.document.remove")}
				editDisabled={!props.isEditable()}
				showRemove={props.isEditable()}
				onEdit={editDocument}
				onRemove={props.remove}
			/>
		</div>
	);
};

export default DocumentNodeView;
