import type {
	DocumentFieldValue,
	DocumentRef,
	ErrorResult,
	FieldError,
} from "@types";
import classNames from "classnames";
import {
	FaSolidPen,
	FaSolidTriangleExclamation,
	FaSolidXmark,
} from "solid-icons/fa";
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
import { usePageBuilderState } from "@/hooks/document/usePageBuilderState";
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
	collectionKeys: string[];
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

type SelectedDocumentItem = {
	key: string;
	value: DocumentFieldValue;
	document?: DocumentRef;
};

const getDocumentKey = (document: DocumentFieldValue) =>
	`${document.collectionKey}:${document.id}`;

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	const pageBuilderState = usePageBuilderState();
	const canOpenSelectModal = () =>
		props.disabled !== true &&
		props.collectionKeys.length > 0 &&
		(props.multiple !== true ||
			typeof props.maxItems !== "number" ||
			(props.value?.length ?? 0) < props.maxItems);

	const openDocuSelectModal = () => {
		if (!canOpenSelectModal()) return;

		pageBuilderModalsStore.open("documentSelect", {
			data: {
				collectionKeys: props.collectionKeys,
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

		const documents = selectedDocumentItems();
		const fromIndex = documents.findIndex((document) => document.key === ref);
		const toIndex = documents.findIndex(
			(document) => document.key === targetRef,
		);
		const nextDocuments = moveArrayItem(documents, fromIndex, toIndex);

		if (nextDocuments === documents) return;

		props.onChange(
			nextDocuments.map((document) => document.value),
			nextDocuments.flatMap((document) =>
				document.document ? [document.document] : [],
			),
		);
	};

	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale || "",
	);
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedDocumentValue = createMemo(() => props.value?.[0]);
	const selectedDocuments = createMemo(() => props.refs() ?? []);
	const selectedDocumentsByKey = createMemo(() => {
		return new Map(
			selectedDocuments().map((document) => [
				getDocumentKey(document),
				document,
			]),
		);
	});
	const selectedDocumentItems = createMemo<SelectedDocumentItem[]>(() =>
		(props.value ?? []).map((value) => {
			const key = getDocumentKey(value);
			return {
				key,
				value,
				document: selectedDocumentsByKey().get(key),
			};
		}),
	);
	const selectedDocumentItem = createMemo(() => selectedDocumentItems()[0]);
	const hasMaxItems = createMemo(() => typeof props.maxItems === "number");
	const hasReachedMaxItems = createMemo(
		() =>
			hasMaxItems() && selectedDocumentItems().length >= (props.maxItems || 0),
	);
	const canAddMore = createMemo(() => !hasReachedMaxItems());
	const fieldErrors = createMemo(() => normalizeFieldErrors(props.errors));

	const collections = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () => selectedDocuments().length > 0,
	});
	const collectionsByKey = createMemo(() => {
		return new Map(
			(collections.data?.data ?? []).map((collection) => [
				collection.key,
				collection,
			]),
		);
	});

	const getItemErrors = (itemIndex: number) => {
		return fieldErrors().filter((error) => error.itemIndex === itemIndex);
	};
	const hasItemError = (itemIndex: number) =>
		getItemErrors(itemIndex).length > 0;
	const getDocumentCollection = (
		document?: Pick<DocumentFieldValue, "collectionKey">,
	) => (document ? collectionsByKey().get(document.collectionKey) : undefined);
	const getSingularName = (
		document?: Pick<DocumentFieldValue, "collectionKey">,
	) =>
		helpers.getLocaleValue({
			value: getDocumentCollection(document)?.details.singularName,
			fallback: T()("media.types.document"),
		});
	const previewFields = (documentRef?: DocumentRef) =>
		getDocumentListingPreviewFields({
			collection: getDocumentCollection(documentRef),
			documentRef,
			contentLocale: contentLocale(),
		}).slice(0, 3);
	const relationVersionLabel = createMemo(() => {
		const relationVersionType = pageBuilderState.relationVersionType?.();

		if (!relationVersionType) return undefined;
		if (relationVersionType === "latest") return T()("common.status.latest");
		if (relationVersionType === "revision") return T()("common.revision");
		return relationVersionType;
	});

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
										<For each={selectedDocumentItems()}>
											{(document, index) => (
												<DocumentSortableItem
													document={document}
													dragId={document.key}
													singularName={getSingularName(document.document)}
													versionLabel={relationVersionLabel()}
													previewFields={previewFields(document.document)}
													hasError={hasItemError(index())}
													removeSelectedDocument={removeSelectedDocument}
													disabled={props.disabled}
													dragDrop={dragDrop}
												/>
											)}
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
									{T()("documents.select.action")}
								</Button>
								<Show when={selectedDocumentItems().length > 0}>
									<p class="text-sm text-unfocused">
										<RelationCount
											count={selectedDocumentItems().length}
											min={props.minItems}
											max={props.maxItems}
										/>
										{typeof props.minItems !== "number" &&
										typeof props.maxItems !== "number"
											? ` ${T()("common.selected").toLowerCase()}`
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
											{getSingularName(selectedDocumentItem()?.document)}
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
										<span class="sr-only">{T()("common.edit")}</span>
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={clearSelection}
										disabled={props.disabled}
									>
										<FaSolidXmark size={14} />
										<span class="sr-only">{T()("common.clear")}</span>
									</Button>
								</div>
							</div>

							<Show
								when={selectedDocumentItem()?.document}
								fallback={
									<div class="py-2">
										<MissingDocumentRefNotice
											document={selectedDocumentItem()?.value}
											versionLabel={relationVersionLabel()}
										/>
									</div>
								}
							>
								{(document) => (
									<Show when={previewFields(document()).length > 0}>
										<div class="py-2">
											<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
												<For each={previewFields(document())}>
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
								)}
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
							{T()("documents.select.action")}
						</Button>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

const MissingDocumentRefNotice: Component<{
	document?: DocumentFieldValue;
	singularName?: string;
	versionLabel?: string;
}> = (props) => {
	const documentLabel = createMemo(
		() => props.singularName ?? T()("media.types.document"),
	);

	return (
		<div class="rounded-md border border-warning-base/30 bg-warning-base/10 px-3 py-2.5">
			<div class="flex items-start gap-2.5">
				<div class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-warning-base/15 text-warning-base">
					<FaSolidTriangleExclamation size={9} />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-xs font-semibold leading-5 text-title">
						<Show
							when={props.document}
							fallback={T()("documents.relations.unavailable.label")}
						>
							{(document) =>
								props.versionLabel
									? T()("documents.relations.unavailable.version.title", {
											document: documentLabel(),
											id: document().id,
											version: props.versionLabel,
										})
									: T()("documents.relations.unavailable.title", {
											document: documentLabel(),
											id: document().id,
										})
							}
						</Show>
					</p>
					<p class="mt-1 text-xs leading-5 text-body">
						{props.versionLabel
							? T()("documents.relations.unavailable.version.description", {
									version: props.versionLabel,
								})
							: T()("documents.relations.unavailable.description")}
					</p>
				</div>
			</div>
		</div>
	);
};

const DocumentSortableItem: Component<{
	document: SelectedDocumentItem;
	dragId: string;
	singularName: string;
	versionLabel?: string;
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
				"view-transition-name": `document-select-item-${props.document.value.collectionKey}-${props.document.value.id}`,
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
							#{props.document.value.id}
						</Pill>
						<p class="truncate text-sm font-medium text-subtitle">
							{props.singularName}
						</p>
					</div>
					<Show
						when={props.document.document}
						fallback={
							<div class="mt-2">
								<MissingDocumentRefNotice
									document={props.document.value}
									singularName={props.singularName}
									versionLabel={props.versionLabel}
								/>
							</div>
						}
					>
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
					</Show>
				</div>
				<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<Button
						type="button"
						theme="danger-subtle"
						size="icon-subtle"
						onClick={() =>
							props.removeSelectedDocument({
								id: props.document.value.id,
								collectionKey: props.document.value.collectionKey,
							})
						}
						disabled={props.disabled}
						aria-label={T()("common.remove")}
					>
						<FaSolidXmark size={14} />
					</Button>
				</div>
			</div>
		</div>
	);
};
