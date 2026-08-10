import type { DocumentRef } from "@types";
import {
	FaSolidArrowLeft,
	FaSolidArrowUpRightFromSquare,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import Button from "@/components/Partials/Button";
import api from "@/services/api";
import T from "@/translations";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import { formatDocumentFieldValue } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { DocumentSelectContent } from "./DocumentSelect";

const scalarTypes = new Set([
	"checkbox",
	"color",
	"datetime",
	"number",
	"select",
	"text",
	"textarea",
]);

const RichTextVariableSelectPanel: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		zIndex?: number;
		collectionKeys: string[];
		localised?: boolean;
		selected?: {
			collectionKey: string;
			documentId: number;
			fieldKey: string;
		};
		selectedRef?: DocumentRef;
	};
	callbacks: {
		onSelect: (selection: {
			collectionKey: string;
			documentId: number;
			fieldKey: string;
			document: DocumentRef;
		}) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [step, setStep] = createSignal<"document" | "field">("document");
	const [documentRef, setDocumentRef] = createSignal<DocumentRef>();
	const [selectedFieldKey, setSelectedFieldKey] = createSignal<string>();

	// ----------------------------------------
	// Memos
	const singleTargetCollectionKey = createMemo(() =>
		props.state.collectionKeys.length === 1
			? props.state.collectionKeys[0]
			: undefined,
	);

	// ----------------------------------------
	// Queries
	const singleTargetCollection = api.collections.useGetSingle({
		queryParams: {
			location: { collectionKey: singleTargetCollectionKey },
		},
		enabled: () => props.state.open && !!singleTargetCollectionKey(),
	});
	const collectionKey = createMemo(
		() =>
			documentRef()?.collectionKey ??
			(singleTargetCollection.data?.data.mode === "single"
				? singleTargetCollectionKey()
				: undefined),
	);
	const singleTargetDocument = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: singleTargetCollectionKey,
				id: () => singleTargetCollection.data?.data.documentId ?? undefined,
				version: "latest",
			},
			include: {},
		},
		enabled: () =>
			props.state.open &&
			singleTargetCollection.data?.data.mode === "single" &&
			typeof singleTargetCollection.data?.data.documentId === "number",
	});
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: { collectionKey },
		},
		enabled: () => props.state.open && !!collectionKey(),
	});

	// ----------------------------------------
	// Memos
	const fields = createMemo(() =>
		(collection.data?.data.fields ?? []).filter(
			(field): field is CollectionLeafFieldConfig =>
				scalarTypes.has(field.type),
		),
	);
	const isSingleCollectionTarget = createMemo(
		() => singleTargetCollection.data?.data.mode === "single",
	);
	const isResolvingSingleTarget = createMemo(
		() =>
			props.state.open &&
			!!singleTargetCollectionKey() &&
			(singleTargetCollection.isLoading ||
				(isSingleCollectionTarget() && singleTargetDocument.isLoading)),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;

		const selected = props.state.selected;
		const selectedRef = props.state.selectedRef;
		if (
			selected &&
			selectedRef?.id === selected.documentId &&
			selectedRef.collectionKey === selected.collectionKey
		) {
			setDocumentRef(selectedRef);
			setSelectedFieldKey(selected.fieldKey);
			setStep("field");
			return;
		}

		if (isSingleCollectionTarget()) {
			setDocumentRef(
				singleTargetDocument.data?.data
					? documentResponseToRef(singleTargetDocument.data.data)
					: undefined,
			);
			setSelectedFieldKey(undefined);
			setStep("field");
			return;
		}

		setDocumentRef(undefined);
		setSelectedFieldKey(undefined);
		setStep("document");
	});

	// ----------------------------------------
	// Functions
	const fieldValue = (
		field: CollectionLeafFieldConfig,
		contentLocale: string,
	) =>
		formatDocumentFieldValue({
			fieldConfig: field,
			fieldData: documentRef()?.fields?.[field.key],
			contentLocale,
			collectionLocalized: collection.data?.data.localized === true,
		});

	const confirmSelection = () => {
		const document = documentRef();
		const fieldKey = selectedFieldKey();
		if (!document || !fieldKey) return;
		props.callbacks.onSelect({
			collectionKey: document.collectionKey,
			documentId: document.id,
			fieldKey,
			document,
		});
	};

	// ----------------------------------------
	// Render
	const renderFieldSelection = (
		contentLocale: Accessor<string | undefined>,
	) => (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<Show when={!isSingleCollectionTarget()}>
						<Button
							type="button"
							theme="secondary-subtle"
							size="icon-subtle"
							onClick={() => setStep("document")}
							aria-label={T()("common.back")}
							title={T()("common.back")}
						>
							<FaSolidArrowLeft size={12} />
						</Button>
					</Show>
					<p class="truncate text-sm text-subtitle">
						{T()("editor.rich.text.document.fallback", {
							collection: documentRef()?.collectionKey,
							id: documentRef()?.id,
						})}
					</p>
				</div>
				<Show when={documentRef()}>
					{(document) => (
						<a
							href={getDocumentRoute("edit", {
								collectionKey: document().collectionKey,
								documentId: document().id,
							})}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary-base hover:text-primary-hover"
						>
							<span>{T()("editor.rich.text.variable.view.document")}</span>
							<FaSolidArrowUpRightFromSquare size={10} />
						</a>
					)}
				</Show>
			</div>
			<div class="grid grow auto-rows-min grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
				<For each={documentRef() ? fields() : []}>
					{(field) => (
						<button
							type="button"
							class="min-h-16 rounded-md border border-border bg-card-base p-3 text-left transition-colors hover:border-primary-muted-border hover:bg-card-hover focus-visible:border-primary-base focus-visible:outline-2 focus-visible:outline-primary-base/30"
							classList={{
								"border-primary-base bg-primary-muted-bg ring-1 ring-primary-base/30":
									selectedFieldKey() === field.key,
							}}
							aria-pressed={selectedFieldKey() === field.key}
							onClick={() => setSelectedFieldKey(field.key)}
						>
							<p class="truncate text-sm font-medium text-title">
								{helpers.getLocaleValue({
									value: field.details.label,
									fallback: field.key,
								})}
							</p>
							<p class="mt-0.5 truncate text-xs text-subtitle">
								{fieldValue(field, contentLocale() ?? "") ||
									T()("common.empty")}
							</p>
						</button>
					)}
				</For>
			</div>
			<Show when={!documentRef()}>
				<p class="text-sm text-subtitle">
					{T()("editor.rich.text.variable.select.document.unavailable")}
				</p>
			</Show>
			<Show when={documentRef() && fields().length === 0}>
				<p class="text-sm text-subtitle">
					{T()("editor.rich.text.variable.select.empty")}
				</p>
			</Show>
			<PanelFooterActions
				selectedCount={selectedFieldKey() ? 1 : 0}
				onClose={() => props.state.setOpen(false)}
				onConfirm={confirmSelection}
				confirmDisabled={!selectedFieldKey()}
				cancelLabel={T()("common.cancel")}
			/>
		</div>
	);

	return (
		<BottomPanel
			zIndex={props.state.zIndex}
			state={{ open: props.state.open, setOpen: props.state.setOpen }}
			fetchState={{
				isLoading:
					isResolvingSingleTarget() ||
					(step() === "field" && collection.isLoading),
				isError:
					singleTargetCollection.isError ||
					singleTargetDocument.isError ||
					(step() === "field" && collection.isError),
			}}
			langauge={{ contentLocale: props.state.localised === true }}
			options={{
				padding: "24",
				hideFooter: true,
				growContent: true,
				fullHeight: true,
			}}
			copy={{
				title: T()("editor.rich.text.variable.select.title"),
				description: T()("editor.rich.text.variable.select.description"),
			}}
		>
			{(language) => (
				<Show
					when={step() === "field"}
					fallback={
						<DocumentSelectContent
							collectionKeys={props.state.collectionKeys}
							multiple={false}
							selected={undefined}
							selectedRefs={undefined}
							onClose={() => props.state.setOpen(false)}
							onSelect={(selection) => {
								const selected = selection.refs[0];
								if (!selected) return;
								setDocumentRef(selected);
								setSelectedFieldKey(undefined);
								setStep("field");
							}}
						/>
					}
				>
					{renderFieldSelection(language?.contentLocale ?? (() => undefined))}
				</Show>
			)}
		</BottomPanel>
	);
};

export default RichTextVariableSelectPanel;
