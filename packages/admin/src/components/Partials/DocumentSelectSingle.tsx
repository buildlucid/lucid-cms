import type { Collection, InternalCollectionDocument } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import { getDocumentReferencePreviewFields } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";
import DocumentReferencePreviewCard from "./DocumentReferencePreviewCard";

/** Presents the automatically selected document for a single collection. */
interface DocumentSelectSingleProps {
	collection: Collection;
	document?: InternalCollectionDocument;
	contentLocale: string;
	isLoading: boolean;
	isError: boolean;
	isExcluded: boolean;
}

const DocumentSelectSingle: Component<DocumentSelectSingleProps> = (props) => {
	// ----------------------------------------
	// Memos
	const documentRef = createMemo(() =>
		props.document ? documentResponseToRef(props.document) : undefined,
	);
	const collectionLabel = createMemo(() =>
		helpers.getLocaleValue({
			value: props.collection.details.name,
			fallback: props.collection.key,
		}),
	);
	const documentTitle = createMemo(
		() =>
			collectionLabel() +
			" · " +
			T()("common.document") +
			" #" +
			(props.document?.id ?? "?"),
	);
	const previewFields = createMemo(() =>
		getDocumentReferencePreviewFields({
			collection: props.collection,
			documentRef: documentRef(),
			contentLocale: props.contentLocale,
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="grow">
			<Show
				when={!props.isLoading}
				fallback={<div class="skeleton min-h-36 rounded-lg" />}
			>
				<Show
					when={!props.isError && props.document && !props.isExcluded}
					fallback={
						<div class="flex min-h-36 items-center justify-center rounded-lg border border-border bg-input-base p-6 text-center">
							<p class="max-w-lg text-sm text-subtitle">
								{props.isError
									? T()("errors.generic.message")
									: props.isExcluded
										? T()("documents.select.single.excluded")
										: T()("documents.select.single.empty")}
							</p>
						</div>
					}
				>
					<DocumentReferencePreviewCard
						title={documentTitle()}
						fields={previewFields()}
					/>
					<p class="mt-3 text-sm text-unfocused mb-0!">
						{T()("documents.select.single.description")}
					</p>
				</Show>
			</Show>
		</div>
	);
};

export default DocumentSelectSingle;
