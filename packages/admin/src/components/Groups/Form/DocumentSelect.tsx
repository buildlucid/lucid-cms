import type {
	DocumentFieldValue,
	DocumentRef,
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
import { getDocumentListingPreviewFields } from "@/utils/document-table-helpers";
import { normalizeFieldErrors } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface DocumentSelectProps {
	id: string;
	collection: string;
	value: DocumentFieldValue[] | undefined;
	refs: Accessor<DocumentRef[] | undefined>;
	onChange: (value: DocumentFieldValue[], refs: DocumentRef[]) => void;
	multiple?: boolean;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError | FieldError[];
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	const openDocuSelectModal = () => {
		pageBuilderModalsStore.open("documentSelect", {
			data: {
				collectionKey: props.collection,
				multiple: isMultiple(),
				selected: props.value,
				selectedRefs: selectedDocuments(),
			},
			onCallback: (selection) => {
				props.onChange(selection.value, selection.refs);
			},
		});
	};
	const clearSelection = () => {
		props.onChange([], []);
	};
	const removeSelectedDocument = (documentValue: DocumentFieldValue) => {
		props.onChange(
			(props.value || []).filter(
				(selectedDocument) =>
					selectedDocument.id !== documentValue.id ||
					selectedDocument.collectionKey !== documentValue.collectionKey,
			),
			selectedDocuments().filter(
				(selectedDocument) =>
					selectedDocument.id !== documentValue.id ||
					selectedDocument.collectionKey !== documentValue.collectionKey,
			),
		);
	};

	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale || "",
	);
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedDocumentValue = createMemo(() => props.value?.[0]);
	const selectedDocuments = createMemo(() => props.refs() ?? []);
	const fieldErrors = createMemo(() => normalizeFieldErrors(props.errors));

	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: props.collection,
			},
		},
		enabled: () => selectedDocuments().length > 0,
	});

	const getItemErrors = (itemIndex: number) => {
		return fieldErrors().filter((error) => error.itemIndex === itemIndex);
	};
	const hasItemError = (itemIndex: number) =>
		getItemErrors(itemIndex).length > 0;
	const previewFields = (documentRef?: DocumentRef) =>
		getDocumentListingPreviewFields({
			collection: collection.data?.data,
			documentRef,
			contentLocale: contentLocale(),
		}).slice(0, 3);

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
					<Match when={isMultiple()}>
						<div class="w-full">
							<div class="flex flex-col gap-2">
								<For each={selectedDocuments()}>
									{(document, index) => (
										<div
											class={classNames(
												"group rounded-md border bg-input-base px-3 py-2 transition-colors duration-200",
												{
													"border-border": !hasItemError(index()),
													"border-error-base ring-1 ring-inset ring-error-base":
														hasItemError(index()),
												},
											)}
										>
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0 flex-1">
													<div class="flex flex-wrap items-center gap-2">
														<Pill theme="outline" class="text-[10px]">
															#{document.id}
														</Pill>
														<p class="truncate text-sm font-medium text-subtitle">
															{helpers.getLocaleValue({
																value:
																	collection.data?.data.details.singularName,
																fallback: T()("document"),
															})}
														</p>
													</div>
													<Show when={previewFields(document).length > 0}>
														<div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
															<For each={previewFields(document)}>
																{(preview) => (
																	<div
																		class="min-w-0 rounded-md border border-border bg-card-base px-2 py-1.5"
																		title={`${preview.label}: ${preview.value}`}
																	>
																		<p class="truncate text-[10px] uppercase tracking-wide text-unfocused">
																			{preview.label}
																		</p>
																		<p class="mt-0.5 truncate text-xs text-subtitle">
																			{preview.value}
																		</p>
																	</div>
																)}
															</For>
														</div>
													</Show>
												</div>
												<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
													<Button
														type="button"
														theme="danger-subtle"
														size="icon-subtle"
														onClick={() =>
															removeSelectedDocument({
																id: document.id,
																collectionKey: document.collectionKey,
															})
														}
														disabled={props.disabled}
														aria-label={T()("remove")}
													>
														<FaSolidXmark size={14} />
													</Button>
												</div>
											</div>
										</div>
									)}
								</For>
							</div>
							<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
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
								<Show when={selectedDocuments().length > 0}>
									<p class="text-sm text-unfocused">
										{selectedDocuments().length} {T()("selected").toLowerCase()}
									</p>
								</Show>
							</div>
						</div>
					</Match>
					<Match
						when={
							!isMultiple() && typeof selectedDocumentValue()?.id === "number"
						}
					>
						<div class="group w-full border border-border rounded-md bg-input-base px-3 pt-2 pb-0">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-2">
										<Pill theme="outline" class="text-[10px]">
											#{selectedDocumentValue()?.id}
										</Pill>
										<span class="inline-flex items-center gap-1.5 text-sm font-medium text-subtitle">
											{helpers.getLocaleValue({
												value: collection.data?.data.details.singularName,
												fallback: T()("document"),
											})}
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
										onClick={clearSelection}
										disabled={props.disabled}
									>
										<FaSolidXmark size={14} />
										<span class="sr-only">{T()("clear")}</span>
									</Button>
								</div>
							</div>

							<Show when={selectedDocuments()[0]}>
								<div class="py-2">
									<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
										<For each={previewFields(selectedDocuments()[0])}>
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
								</div>
							</Show>
						</div>
					</Match>
					<Match when={typeof selectedDocumentValue()?.id !== "number"}>
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
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
