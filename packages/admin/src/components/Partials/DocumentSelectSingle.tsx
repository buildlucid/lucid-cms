import type { Collection, InternalCollectionDocument } from "@types";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import T from "@/translations";
import { getDocumentReferencePreviewFields } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";

interface DocumentSelectSingleProps {
	collection: Collection;
	document?: InternalCollectionDocument;
	contentLocale: string;
	isLoading: boolean;
	isError: boolean;
	isExcluded: boolean;
	selected: boolean;
	onSelect: () => void;
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
					<label class="relative block cursor-pointer overflow-hidden rounded-lg border border-border bg-input-base transition-colors hover:border-primary-muted-border hover:bg-row-hover">
						<input
							type="checkbox"
							checked={props.selected}
							onChange={props.onSelect}
							class="peer sr-only"
							aria-label={documentTitle()}
						/>
						<span class="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-primary-base/30" />
						<div class="flex items-start gap-3 px-3 py-2.5">
							<span
								class="flex h-5 w-5 min-w-5 items-center justify-center rounded-md border border-border bg-input-base text-secondary-contrast transition-colors duration-200"
								classList={{
									"border-secondary-hover bg-secondary-base": props.selected,
								}}
								aria-hidden="true"
							>
								<Show when={props.selected}>
									<FaSolidCheck size={10} />
								</Show>
							</span>
							<p class="min-w-0 grow truncate text-sm font-medium text-title mb-0!">
								{documentTitle()}
							</p>
						</div>
						<Show when={previewFields().length > 0}>
							<div
								class="grid grid-cols-1 border-border border-t"
								classList={{
									"sm:grid-cols-2": previewFields().length === 2,
									"sm:grid-cols-3": previewFields().length >= 3,
								}}
							>
								<For each={previewFields()}>
									{(field, index) => (
										<div
											class="min-w-0 border-border px-3 py-2.5 sm:not-first:border-l"
											classList={{
												"border-t": index() > 0,
												"sm:border-t-0": index() > 0,
											}}
											title={`${field.label}: ${field.value}`}
										>
											<p class="truncate text-[11px] font-medium text-unfocused mb-0!">
												{field.label}
											</p>
											<p class="mt-0.5 truncate text-xs text-subtitle mb-0!">
												{field.value}
											</p>
										</div>
									)}
								</For>
							</div>
						</Show>
					</label>
				</Show>
			</Show>
		</div>
	);
};

export default DocumentSelectSingle;
