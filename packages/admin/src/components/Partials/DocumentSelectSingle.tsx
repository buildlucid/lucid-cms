import type { Collection, InternalCollectionDocument } from "@types";
import { FaSolidFileLines } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import T from "@/translations";
import {
	getDocumentListingPreviewFields,
	getDocumentPreviewLabel,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";

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
	const documentLabel = createMemo(() =>
		getDocumentPreviewLabel({
			collection: props.collection,
			document: props.document,
			contentLocale: props.contentLocale,
		}),
	);
	const previewFields = createMemo(() =>
		getDocumentListingPreviewFields({
			collection: props.collection,
			documentRef: documentRef(),
			contentLocale: props.contentLocale,
		}).slice(0, 4),
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
					<div class="overflow-hidden rounded-lg border border-border bg-input-base">
						<div class="flex items-start gap-3 p-4">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card-base text-icon-base">
								<FaSolidFileLines size={18} />
							</div>
							<div class="min-w-0 grow">
								<p class="text-xs font-medium text-unfocused mb-0!">
									{T()("documents.select.single.label")}
								</p>
								<p class="mt-1 truncate text-base font-semibold text-title mb-0!">
									{documentLabel()}
								</p>
								<p class="mt-1 truncate text-xs text-subtitle mb-0!">
									{collectionLabel()} · #{props.document?.id}
								</p>
							</div>
						</div>
						<Show when={previewFields().length > 0}>
							<div class="grid border-border border-t sm:grid-cols-2">
								<For each={previewFields()}>
									{(field, index) => (
										<div
											class="min-w-0 border-border px-4 py-3 sm:[&:nth-child(even)]:border-l"
											classList={{
												"border-t": index() > 0,
												"sm:border-t-0": index() === 1,
											}}
										>
											<p class="truncate text-[11px] font-medium text-unfocused mb-0!">
												{field.label}
											</p>
											<p class="mt-0.5 truncate text-sm text-subtitle mb-0!">
												{field.value || T()("common.empty")}
											</p>
										</div>
									)}
								</For>
							</div>
						</Show>
					</div>
					<p class="mt-3 text-sm text-subtitle mb-0!">
						{T()("documents.select.single.description")}
					</p>
				</Show>
			</Show>
		</div>
	);
};

export default DocumentSelectSingle;
