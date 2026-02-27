import type {
	DocumentRef,
	DocumentResponse,
	ErrorResult,
	FieldError,
} from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import { getDocumentListingPreviewFields } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";

interface DocumentSelectProps {
	id: string;
	collection: string;
	value: number | undefined;
	onChange: (value: number | null, ref: DocumentRef | null) => void;
	ref: Accessor<DocumentRef | undefined>;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const documentResponseToRef = (doc: DocumentResponse): DocumentRef => ({
		id: doc.id,
		collectionKey: doc.collectionKey,
		fields: brickHelpers.objectifyFields(doc.fields || []),
	});
	const openDocuSelectModal = () => {
		pageBuilderModalsStore.open("documentSelect", {
			data: {
				collectionKey: props.collection,
				selected: props.value,
			},
			onCallback: (doc: DocumentResponse) => {
				props.onChange(doc.id, documentResponseToRef(doc));
			},
		});
	};

	// -------------------------------
	// Memos
	const storeDocumentRef = createMemo(() => props.ref());
	const previewCollectionKey = createMemo(
		() => storeDocumentRef()?.collectionKey || props.collection,
	);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale || "",
	);

	// -------------------------------
	// Queries
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: previewCollectionKey,
			},
		},
		key: () => `document-field-preview:${previewCollectionKey() || "unknown"}`,
		enabled: () => typeof props.value === "number" && !!previewCollectionKey(),
		refetchOnWindowFocus: false,
	});

	// -------------------------------
	// Memos
	const previewFields = createMemo(() =>
		getDocumentListingPreviewFields({
			collection: collection.data?.data,
			documentRef: storeDocumentRef(),
			contentLocale: contentLocale(),
		}),
	);
	const isPreviewLoading = createMemo(
		() => typeof props.value === "number" && collection.isLoading,
	);
	const gridPreviewFields = createMemo(() => previewFields().slice(0, 6));
	const documentPreviewLabel = createMemo(() => {
		const singularCollectionTitle = helpers.getLocaleValue({
			value: collection.data?.data.details.singularName,
		});
		if (gridPreviewFields().length === 0) {
			return singularCollectionTitle || T()("document");
		}
		return `${singularCollectionTitle || T()("document")} ${T()("preview")}`;
	});

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
			/>
			<div class="w-full">
				<Switch>
					<Match when={typeof props.value !== "number"}>
						<Button
							type="button"
							theme="border-outline"
							size="small"
							onClick={openDocuSelectModal}
							disabled={props.disabled}
							classes="capitalize"
						>
							{T()("select_document")}
						</Button>
					</Match>
					<Match when={typeof props.value === "number"}>
						<div class="group w-full border border-border rounded-md bg-input-base px-3 pt-2 pb-0">
							<div
								class={classNames("flex items-center justify-between gap-3", {
									"pb-2": gridPreviewFields().length === 0,
								})}
							>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<Pill theme="outline" class="text-[10px]">
											#{props.value}
										</Pill>
										<span class="inline-flex items-center gap-1.5 text-sm font-medium text-subtitle">
											{documentPreviewLabel()}
										</span>
									</div>
								</div>
								<div class="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openDocuSelectModal}
										disabled={props.disabled}
									>
										<FaSolidPen size={12} />
										<span class="sr-only">{T()("edit")}</span>
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={() => {
											props.onChange(null, null);
										}}
										disabled={props.disabled}
									>
										<FaSolidXmark size={14} />
										<span class="sr-only">{T()("clear")}</span>
									</Button>
								</div>
							</div>

							<Show when={gridPreviewFields().length > 0}>
								<div class="py-2">
									<Show
										when={!isPreviewLoading()}
										fallback={
											<div>
												<span class="skeleton block h-4 w-24 mb-2" />
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
													<span class="skeleton block h-12 w-full rounded-md" />
													<span class="skeleton block h-12 w-full rounded-md" />
													<span class="skeleton block h-12 w-full rounded-md" />
												</div>
											</div>
										}
									>
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
											<For each={gridPreviewFields()}>
												{(preview) => (
													<div
														class="min-w-0 rounded-md border border-border px-2 py-1.5 bg-card-base"
														title={`${preview.label}: ${preview.value}`}
													>
														<p class="text-[10px] uppercase tracking-wide text-unfocused truncate">
															{preview.label}
														</p>
														<p class="text-xs text-subtitle truncate mt-0.5">
															{preview.value}
														</p>
													</div>
												)}
											</For>
										</div>
									</Show>
								</div>
							</Show>
						</div>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
