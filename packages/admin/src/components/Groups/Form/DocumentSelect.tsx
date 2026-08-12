import type {
	Collection,
	DocumentRef,
	ErrorResult,
	FieldError,
	RelationFieldValue,
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
import Button from "@/components/Partials/Button";
import DocumentReferencePreviewCard from "@/components/Partials/DocumentReferencePreviewCard";
import DragDrop, { type DragDropCBT } from "@/components/Partials/DragDrop";
import RelationCount from "@/components/Partials/RelationCount";
import { usePageBuilderState } from "@/hooks/document/usePageBuilderState";
import api from "@/services/api";
import brickStore from "@/store/brick-store";
import contentLocaleStore from "@/store/contentLocaleStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import { moveArrayItem } from "@/utils/array-helpers";
import {
	type DocumentListingPreviewField,
	getDocumentPreviewLabel,
	getDocumentReferencePreviewFields,
} from "@/utils/document-table-helpers";
import { normalizeFieldErrors } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import { DescribedBy } from "./DescribedBy";
import { ErrorMessage } from "./ErrorMessage";
import { Label } from "./Label";

interface DocumentSelectProps {
	id: string;
	collectionKeys: string[];
	value: RelationFieldValue[] | undefined;
	refs: Accessor<DocumentRef[] | undefined>;
	onChange: (value: RelationFieldValue[], refs: DocumentRef[]) => void;
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
	value: RelationFieldValue;
	document?: DocumentRef;
};

const getDocumentKey = (document: RelationFieldValue) =>
	`${document.collectionKey}:${document.id}`;

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const pageBuilderState = usePageBuilderState();

	// ----------------------------------------
	// Functions
	const canOpenSelectModal = () =>
		props.disabled !== true &&
		props.collectionKeys.length > 0 &&
		(props.multiple !== true ||
			typeof props.maxItems !== "number" ||
			(props.value?.length ?? 0) < props.maxItems);

	const openDocuSelectModal = () => {
		if (!canOpenSelectModal()) return;

		const sourceCollectionKey = pageBuilderState.documentState?.collectionKey();
		const sourceDocumentId = pageBuilderState.documentState?.documentId();

		pageBuilderModalsStore.open("documentSelect", {
			data: {
				collectionKeys: props.collectionKeys,
				multiple: isMultiple(),
				selected: props.value,
				selectedRefs: selectedDocuments(),
				excludeDocument:
					sourceCollectionKey !== undefined && sourceDocumentId !== undefined
						? {
								collectionKey: sourceCollectionKey,
								id: sourceDocumentId,
							}
						: undefined,
			},
			onCallback: (selection) => {
				props.onChange(selection.value, selection.refs);
			},
		});
	};
	const clearSelection = () => {
		props.onChange([], []);
	};
	const removeSelectedDocument = (documentValue: RelationFieldValue) => {
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

	// ----------------------------------------
	// Memos
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
	const pageBuilderCollections = createMemo(() =>
		pageBuilderState.documentState?.collections?.(),
	);

	// ----------------------------------------
	// Queries
	const collectionsQuery = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () =>
			pageBuilderCollections() === undefined && selectedDocuments().length > 0,
	});
	const collections = createMemo<Collection[]>(
		() => pageBuilderCollections() ?? collectionsQuery.data?.data ?? [],
	);
	const collectionsByKey = createMemo(() => {
		return new Map(
			collections().map((collection) => [collection.key, collection]),
		);
	});

	// ----------------------------------------
	// Functions
	const getItemErrors = (itemIndex: number) => {
		return fieldErrors().filter((error) => error.itemIndex === itemIndex);
	};
	const hasItemError = (itemIndex: number) =>
		getItemErrors(itemIndex).length > 0;
	const getDocumentCollection = (
		document?: Pick<RelationFieldValue, "collectionKey">,
	) => (document ? collectionsByKey().get(document.collectionKey) : undefined);
	const getSingularName = (
		document?: Pick<RelationFieldValue, "collectionKey">,
	) =>
		helpers.getLocaleValue({
			value: getDocumentCollection(document)?.details.singularName,
			fallback: T()("media.types.document"),
		});
	const getDocumentLabel = (
		documentRef?: DocumentRef,
		documentValue?: RelationFieldValue,
	) =>
		getDocumentPreviewLabel({
			collection: getDocumentCollection(documentRef ?? documentValue),
			document:
				documentRef ??
				(documentValue
					? {
							id: documentValue.id,
							collectionKey: documentValue.collectionKey,
							route: null,
							fields: null,
						}
					: undefined),
			contentLocale: contentLocale(),
		});
	const previewFields = (documentRef?: DocumentRef, documentLabel?: string) =>
		getDocumentReferencePreviewFields({
			collection: getDocumentCollection(documentRef),
			documentRef,
			contentLocale: contentLocale(),
			primaryLabel: documentLabel,
		});
	const documentSubtitle = (document: RelationFieldValue) =>
		getSingularName(document) +
		" · " +
		T()("common.document") +
		" #" +
		document.id;
	const relationVersionLabel = createMemo(() => {
		const relationVersionType = pageBuilderState.relationVersionType?.();

		if (!relationVersionType) return undefined;
		if (relationVersionType === "latest") return T()("common.status.latest");
		if (relationVersionType === "revision") return T()("common.revision");
		return relationVersionType;
	});

	// ----------------------------------------
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
													documentLabel={getDocumentLabel(
														document.document,
														document.value,
													)}
													singularName={getSingularName(document.value)}
													versionLabel={relationVersionLabel()}
													previewFields={previewFields(
														document.document,
														getDocumentLabel(document.document, document.value),
													)}
													documentSubtitle={documentSubtitle(document.value)}
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
							<div
								class={classNames(
									"flex flex-wrap items-center justify-between gap-3",
									{
										"mt-3": selectedDocumentItems().length > 0,
									},
								)}
							>
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
						<DocumentReferencePreviewCard
							class="group w-full"
							title={getDocumentLabel(
								selectedDocumentItem()?.document,
								selectedDocumentItem()?.value,
							)}
							subtitle={
								selectedDocumentItem()?.value
									? documentSubtitle(selectedDocumentItem()?.value)
									: undefined
							}
							fields={
								selectedDocumentItem()?.document
									? previewFields(
											selectedDocumentItem()?.document,
											getDocumentLabel(
												selectedDocumentItem()?.document,
												selectedDocumentItem()?.value,
											),
										)
									: []
							}
							actions={
								<div class="flex items-center gap-0.5 opacity-100 transition-opacity duration-200 md:opacity-0 group-hover:opacity-100">
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openDocuSelectModal}
										disabled={props.disabled}
										aria-label={T()("common.edit")}
									>
										<FaSolidPen size={12} />
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={clearSelection}
										disabled={props.disabled}
										aria-label={T()("common.clear")}
									>
										<FaSolidXmark size={14} />
									</Button>
								</div>
							}
							footer={
								selectedDocumentItem()?.document ? undefined : (
									<div class="border-border border-t p-3">
										<MissingDocumentRefNotice
											document={selectedDocumentItem()?.value}
											versionLabel={relationVersionLabel()}
										/>
									</div>
								)
							}
							invalid={hasItemError(0)}
						/>
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
	document?: RelationFieldValue;
	singularName?: string;
	versionLabel?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const documentLabel = createMemo(
		() => props.singularName ?? T()("media.types.document"),
	);

	// ----------------------------------------
	// Render
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
	documentLabel: string;
	documentSubtitle: string;
	singularName: string;
	versionLabel?: string;
	previewFields: DocumentListingPreviewField[];
	hasError: boolean;
	removeSelectedDocument: (documentValue: RelationFieldValue) => void;
	dragDrop: DragDropCBT;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<DocumentReferencePreviewCard
			data-dragkey={DOCUMENT_SELECT_DRAG_DROP_KEY}
			data-dragref={props.dragId}
			style={{
				"view-transition-name":
					"document-select-item-" +
					props.document.value.collectionKey +
					"-" +
					props.document.value.id,
			}}
			class={classNames(
				"group ring-inset ring-primary-base transition-colors duration-200 transform-gpu",
				{
					"ring-1 ring-inset ring-error-base": props.hasError,
					"opacity-60": props.dragDrop.getDragging()?.ref === props.dragId,
					"ring-1 ring-primary-base":
						props.dragDrop.getDraggingTarget()?.ref === props.dragId &&
						props.dragDrop.getDragging()?.ref !== props.dragId &&
						!props.hasError,
					"cursor-grab active:cursor-grabbing": props.disabled !== true,
				},
			)}
			title={props.documentLabel}
			subtitle={props.documentSubtitle}
			fields={props.document.document ? props.previewFields : []}
			actions={
				<div class="opacity-100 transition-opacity duration-200 md:opacity-0 group-hover:opacity-100">
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
			}
			footer={
				props.document.document ? undefined : (
					<div class="border-border border-t p-3">
						<MissingDocumentRefNotice
							document={props.document.value}
							singularName={props.singularName}
							versionLabel={props.versionLabel}
						/>
					</div>
				)
			}
			invalid={props.hasError}
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
		/>
	);
};
