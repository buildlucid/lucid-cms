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
import DragDrop, { type DragDropCBT } from "@/components/Partials/DragDrop";
import Pill from "@/components/Partials/Pill";
import RelationCount from "@/components/Partials/RelationCount";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import { moveArrayItem } from "@/utils/array-helpers";
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
	minItems?: number;
	maxItems?: number;
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

const DOCUMENT_SELECT_DRAG_DROP_KEY = "document-select-zone";

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	const canOpenSelectModal = () =>
		props.disabled !== true &&
		(props.multiple !== true ||
			typeof props.maxItems !== "number" ||
			(props.refs()?.length ?? 0) < props.maxItems);

	const openDocuSelectModal = () => {
		if (!canOpenSelectModal()) return;

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
	const reorderSelectedDocuments = (ref: string, targetRef: string) => {
		if (props.disabled) return;

		const documents = selectedDocuments();
		const fromIndex = documents.findIndex(
			(document) => `${document.collectionKey}:${document.id}` === ref,
		);
		const toIndex = documents.findIndex(
			(document) => `${document.collectionKey}:${document.id}` === targetRef,
		);
		const nextDocuments = moveArrayItem(documents, fromIndex, toIndex);

		if (nextDocuments === documents) return;

		props.onChange(
			nextDocuments.map((document) => ({
				id: document.id,
				collectionKey: document.collectionKey,
			})),
			nextDocuments,
		);
	};

	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale || "",
	);
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedDocumentValue = createMemo(() => props.value?.[0]);
	const selectedDocumentKeys = createMemo(() =>
		(props.value ?? []).map(
			(document) => `${document.collectionKey}:${document.id}`,
		),
	);
	const selectedDocuments = createMemo(() => props.refs() ?? []);
	const selectedDocumentsByKey = createMemo(() => {
		return new Map(
			selectedDocuments().map((document) => [
				`${document.collectionKey}:${document.id}`,
				document,
			]),
		);
	});
	const hasMaxItems = createMemo(() => typeof props.maxItems === "number");
	const hasReachedMaxItems = createMemo(
		() => hasMaxItems() && selectedDocuments().length >= (props.maxItems || 0),
	);
	const canAddMore = createMemo(() => !hasReachedMaxItems());
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
							<DragDrop
								animationMode="web-animation"
								sortOrder={(ref, targetRef) => {
									reorderSelectedDocuments(ref, targetRef);
								}}
							>
								{({ dragDrop }) => (
									<div class="flex flex-col gap-2">
										<For each={selectedDocumentKeys()}>
											{(documentKey, index) => {
												return (
													<Show
														when={selectedDocumentsByKey().get(documentKey)}
													>
														{(document) => (
															<DocumentSortableItem
																document={document()}
																dragId={documentKey}
																singularName={helpers.getLocaleValue({
																	value:
																		collection.data?.data.details.singularName,
																	fallback: T()("document"),
																})}
																previewFields={previewFields(document())}
																hasError={hasItemError(index())}
																removeSelectedDocument={removeSelectedDocument}
																disabled={props.disabled}
																dragDrop={dragDrop}
															/>
														)}
													</Show>
												);
											}}
										</For>
									</div>
								)}
							</DragDrop>
							<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
								<Button
									type="button"
									theme="border-outline"
									size="small"
									onClick={openDocuSelectModal}
									disabled={props.disabled || !canAddMore()}
									classes="capitalize"
								>
									{T()("select_document")}
								</Button>
								<Show when={selectedDocuments().length > 0}>
									<p class="text-sm text-unfocused">
										<RelationCount
											count={selectedDocuments().length}
											min={props.minItems}
											max={props.maxItems}
										/>
										{typeof props.minItems !== "number" &&
										typeof props.maxItems !== "number"
											? ` ${T()("selected").toLowerCase()}`
											: ""}
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
							disabled={props.disabled || !canAddMore()}
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

const DocumentSortableItem: Component<{
	document: DocumentRef;
	dragId: string;
	singularName: string;
	previewFields: { label: string; value: string }[];
	hasError: boolean;
	removeSelectedDocument: (documentValue: DocumentFieldValue) => void;
	dragDrop: DragDropCBT;
	disabled?: boolean;
}> = (props) => {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: native draggable container
		<div
			data-dragkey={DOCUMENT_SELECT_DRAG_DROP_KEY}
			data-dragref={props.dragId}
			style={{
				"view-transition-name": `document-select-item-${props.document.collectionKey}-${props.document.id}`,
			}}
			class={classNames(
				"group rounded-md border bg-input-base px-3 py-2 ring-inset ring-primary-base transition-colors duration-200 transform-gpu",
				{
					"border-border": !props.hasError,
					"border-error-base ring-1 ring-inset ring-error-base": props.hasError,
					"opacity-60": props.dragDrop.getDragging()?.ref === props.dragId,
					"ring-1 ring-primary-base":
						props.dragDrop.getDraggingTarget()?.ref === props.dragId &&
						props.dragDrop.getDragging()?.ref !== props.dragId &&
						!props.hasError,
					"cursor-grab active:cursor-grabbing": props.disabled !== true,
				},
			)}
			draggable={props.disabled !== true}
			onDragStart={(e) => {
				brickStore.get.startRelationFieldDrag();
				props.dragDrop.onDragStart(e, {
					ref: props.dragId,
					key: DOCUMENT_SELECT_DRAG_DROP_KEY,
				});
			}}
			onDragEnd={(e) => {
				props.dragDrop.onDragEnd(e);
				brickStore.get.endRelationFieldDrag();
			}}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: props.dragId,
					key: DOCUMENT_SELECT_DRAG_DROP_KEY,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<Pill theme="outline" class="text-[10px]">
							#{props.document.id}
						</Pill>
						<p class="truncate text-sm font-medium text-subtitle">
							{props.singularName}
						</p>
					</div>
					<Show when={props.previewFields.length > 0}>
						<div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
							<For each={props.previewFields}>
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
							props.removeSelectedDocument({
								id: props.document.id,
								collectionKey: props.document.collectionKey,
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
	);
};
