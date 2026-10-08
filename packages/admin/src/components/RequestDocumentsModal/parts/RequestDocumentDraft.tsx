import type { Collection, InternalCollectionDocument } from "@types";
import { TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import Button from "@/components/Button/Button";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";

const RequestDocumentDraft: Component<{
	draft: { collectionKey: string; documentId: number };
	document: InternalCollectionDocument | undefined;
	collection: Collection | undefined;
	onRemove: () => void;
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		props.collection && props.document
			? getDocumentPreviewLabel({
					collection: props.collection,
					document: props.document,
					contentLocale: contentLocaleStore.get.contentLocale ?? "",
				})
			: undefined,
	);
	const collectionLabel = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
				fallback: props.draft.collectionKey,
			}) || props.draft.collectionKey,
	);

	// ----------------------------------------
	// Render
	return (
		<li class="rounded-md border border-border bg-card">
			<div class="group/draft flex items-center gap-3 p-2.5">
				<DocumentThumb />
				<div class="min-w-0 grow">
					<Show
						when={label()}
						fallback={<span class="skeleton block h-5 w-32" />}
					>
						<p class="truncate text-sm text-title">{label()}</p>
					</Show>
					<p class="mt-0.5 truncate text-xs text-muted">
						{collectionLabel()} #{props.draft.documentId}
					</p>
				</div>
				<Button
					variant="danger-ghost"
					size="xs"
					shape="square"
					class="transition-opacity md:opacity-0 md:group-hover/draft:opacity-100 md:focus-visible:opacity-100"
					aria-label={T()("requests.create.clear.document")}
					title={T()("requests.create.clear.document")}
					onClick={props.onRemove}
				>
					<TbOutlineX size={14} />
				</Button>
			</div>
			{props.children}
		</li>
	);
};

export default RequestDocumentDraft;
