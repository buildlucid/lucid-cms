import { isFieldTypeRichTextVariable } from "@field-capabilities";
import type { DocumentRef, RichTextUserVariableField, UserRef } from "@types";
import { FaSolidArrowLeft } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import { DocumentSelectContent } from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import { Drawer } from "@/components/Drawer/Drawer";
import {
	getRichTextUserFieldText,
	isRichTextUserVariableField,
} from "@/components/RichText/helpers";
import type {
	RichTextVariableReference,
	RichTextVariableSelection,
} from "@/components/RichText/types";
import { Select } from "@/components/Select/Select";
import { UserSelectContent } from "@/components/UserSelectDrawer/UserSelectDrawer";
import { resolveCollectionContentLocales } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { usePageBuilderState } from "@/hooks/usePageBuilderState/usePageBuilderState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import { formatDocumentFieldValue } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";

type VariableSource = RichTextVariableReference["source"];
type UserReference = NonNullable<UserRef>;
type RichTextVariableFieldOption = {
	key: string;
	label: string;
	value: string;
};

const RichTextVariableSelectDrawer: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		zIndex?: number;
		collectionKeys: string[];
		userFields: RichTextUserVariableField[];
		selected?: RichTextVariableReference;
		selectedDocumentRef?: DocumentRef;
		selectedUserRef?: UserReference;
	};
	callbacks: {
		onSelect: (selection: RichTextVariableSelection) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [source, setSource] = createSignal<VariableSource>("document");
	const [step, setStep] = createSignal<"target" | "field">("target");
	const [documentRef, setDocumentRef] = createSignal<DocumentRef>();
	const [userRef, setUserRef] = createSignal<UserReference>();
	const [selectedFieldKey, setSelectedFieldKey] = createSignal<string>();
	const pageBuilderState = usePageBuilderState();

	// ----------------------------------------
	// Queries
	const collectionKey = createMemo(() => documentRef()?.collectionKey);
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: { collectionKey },
		},
		enabled: () =>
			pageBuilderState.documentState === undefined &&
			props.state.open &&
			source() === "document" &&
			!!collectionKey(),
	});

	// ----------------------------------------
	// Memos
	const collection = createMemo(() => {
		const key = collectionKey();
		return (
			(key
				? pageBuilderState.documentState?.collectionsByKey().get(key)
				: undefined) ?? collectionQuery.data?.data
		);
	});
	const collectionIsLoading = createMemo(() =>
		pageBuilderState.documentState
			? pageBuilderState.documentState.collectionsQuery.isLoading
			: collectionQuery.isLoading,
	);
	const collectionIsError = createMemo(() =>
		pageBuilderState.documentState
			? pageBuilderState.documentState.collectionsQuery.isError
			: collectionQuery.isError,
	);
	const documentEnabled = createMemo(
		() => props.state.collectionKeys.length > 0,
	);
	const userEnabled = createMemo(() => props.state.userFields.length > 0);
	const sourceOptions = createMemo(() => {
		const options: Array<{ value: VariableSource; label: string }> = [];
		if (documentEnabled()) {
			options.push({
				value: "document",
				label: T()("common.document"),
			});
		}
		if (userEnabled()) {
			options.push({
				value: "user",
				label: T()("common.user"),
			});
		}
		return options;
	});
	const documentFields = createMemo(() =>
		(collection()?.fields ?? []).filter(
			(field): field is CollectionLeafFieldConfig =>
				isFieldTypeRichTextVariable(field.type),
		),
	);
	const documentLocales = createMemo(() =>
		resolveCollectionContentLocales(
			contentLocaleStore.get.locales,
			collection()?.localized,
		),
	);
	const currentDocumentSelection = createMemo(() => {
		const document = documentRef();
		if (!document) return undefined;
		return {
			values: [{ collectionKey: document.collectionKey, id: document.id }],
			refs: [document],
		};
	});
	const currentUserSelection = createMemo(() => {
		const user = userRef();
		if (!user) return undefined;
		return { values: [user.id], refs: [user] };
	});
	const documentFieldOptions = (
		contentLocale: string,
	): RichTextVariableFieldOption[] =>
		documentFields().map((field) => ({
			key: field.key,
			label: helpers.getLocaleValue({
				value: field.details.label,
				fallback: field.key,
			}),
			value:
				formatDocumentFieldValue({
					fieldConfig: field,
					fieldData: documentRef()?.fields?.[field.key],
					contentLocale,
					collectionLocalized: Boolean(collection()?.localized),
				}) ?? "",
		}));
	const userFieldOptions = createMemo<RichTextVariableFieldOption[]>(() => {
		const user = userRef();
		if (!user) return [];
		return props.state.userFields.map((fieldKey) => ({
			key: fieldKey,
			label: getUserFieldLabel(fieldKey),
			value: getRichTextUserFieldText(user, fieldKey),
		}));
	});
	const variableFieldOptions = (contentLocale: string) =>
		source() === "document"
			? documentFieldOptions(contentLocale)
			: userFieldOptions();
	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;

		const selected = props.state.selected;
		if (
			selected?.source === "document" &&
			documentEnabled() &&
			props.state.selectedDocumentRef?.id === selected.documentId &&
			props.state.selectedDocumentRef.collectionKey === selected.collectionKey
		) {
			setSource("document");
			setDocumentRef(props.state.selectedDocumentRef);
			setUserRef(undefined);
			setSelectedFieldKey(selected.fieldKey);
			setStep("field");
			return;
		}

		if (
			selected?.source === "user" &&
			userEnabled() &&
			props.state.selectedUserRef?.id === selected.userId
		) {
			setSource("user");
			setUserRef(props.state.selectedUserRef);
			setDocumentRef(undefined);
			setSelectedFieldKey(selected.fieldKey);
			setStep("field");
			return;
		}

		setSource(documentEnabled() ? "document" : "user");
		setDocumentRef(undefined);
		setUserRef(undefined);
		setSelectedFieldKey(undefined);
		setStep("target");
	});

	// ----------------------------------------
	// Functions
	const changeSource = (nextSource: VariableSource) => {
		if (nextSource === source()) return;
		setSource(nextSource);
		setSelectedFieldKey(undefined);
		setStep("target");
	};
	const confirmSelection = () => {
		const fieldKey = selectedFieldKey();
		if (!fieldKey) return;

		if (source() === "document") {
			const document = documentRef();
			if (!document) return;
			props.callbacks.onSelect({
				source: "document",
				collectionKey: document.collectionKey,
				documentId: document.id,
				fieldKey,
				document,
			});
			return;
		}

		const user = userRef();
		if (!user || !isRichTextUserVariableField(fieldKey)) return;
		props.callbacks.onSelect({
			source: "user",
			userId: user.id,
			fieldKey,
			user,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
			loading={
				source() === "document" && step() === "field" && collectionIsLoading()
			}
			error={
				source() === "document" && step() === "field" && collectionIsError()
					? T()("errors.generic.message")
					: undefined
			}
			locales={documentLocales()}
			zIndex={props.state.zIndex}
		>
			{(contentLocale) => (
				<>
					<Drawer.Header>
						<Drawer.Title>
							{T()("editor.rich.text.variable.select.title")}
						</Drawer.Title>
						<Drawer.Description>
							{T()("editor.rich.text.variable.select.description")}
						</Drawer.Description>
					</Drawer.Header>
					<Drawer.Body>
						<div class="flex h-full min-h-0 flex-col">
							<div class="min-h-0 grow">
								<Show
									when={step() === "field"}
									fallback={
										<Show
											when={source() === "document"}
											fallback={
												<UserSelectContent
													topbarSlot={
														sourceOptions().length > 1 ? (
															<VariableSourceSelect
																source={source()}
																options={sourceOptions()}
																onChange={changeSource}
															/>
														) : undefined
													}
													multiple={false}
													selected={currentUserSelection()?.values}
													selectedRefs={currentUserSelection()?.refs}
													onClose={() => props.state.setOpen(false)}
													onSelect={(selection) => {
														const selected = selection.refs[0];
														if (!selected) return;
														setUserRef(selected);
														setSelectedFieldKey(undefined);
														setStep("field");
													}}
												/>
											}
										>
											<DocumentSelectContent
												topbarSlot={
													sourceOptions().length > 1 ? (
														<VariableSourceSelect
															source={source()}
															options={sourceOptions()}
															onChange={changeSource}
														/>
													) : undefined
												}
												collectionKeys={props.state.collectionKeys}
												multiple={false}
												selected={currentDocumentSelection()?.values}
												selectedRefs={currentDocumentSelection()?.refs}
												onClose={() => props.state.setOpen(false)}
												onSelect={(selection) => {
													const selected = selection.refs[0];
													if (!selected) return;
													setDocumentRef(selected);
													setSelectedFieldKey(undefined);
													setStep("field");
												}}
											/>
										</Show>
									}
								>
									<div class="flex h-full flex-col">
										<div
											class="grid grow auto-rows-min grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
											role="radiogroup"
										>
											<For each={variableFieldOptions(contentLocale() ?? "")}>
												{(field) => (
													<label
														class="relative flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-border bg-card-base p-3 text-left transition-colors hover:border-primary-muted-border hover:bg-card-hover"
														classList={{
															"border-primary-base ring-1 ring-primary-base/20":
																selectedFieldKey() === field.key,
														}}
													>
														<input
															type="radio"
															name="rich-text-variable-field"
															value={field.key}
															checked={selectedFieldKey() === field.key}
															onChange={() => setSelectedFieldKey(field.key)}
															class="peer sr-only"
														/>
														<span class="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-primary-base/30" />
														<span
															class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-input-base"
															classList={{
																"border-primary-base":
																	selectedFieldKey() === field.key,
															}}
															aria-hidden="true"
														>
															<Show when={selectedFieldKey() === field.key}>
																<span class="size-2 rounded-full bg-primary-base" />
															</Show>
														</span>
														<span class="min-w-0 grow">
															<span class="block truncate text-sm font-medium text-title">
																{field.label}
															</span>
															<span class="mt-0.5 block truncate text-xs text-subtitle">
																{field.value || T()("common.empty")}
															</span>
														</span>
													</label>
												)}
											</For>
										</div>
										<Show
											when={
												variableFieldOptions(contentLocale() ?? "").length === 0
											}
										>
											<p class="text-sm text-subtitle">
												{T()("editor.rich.text.variable.select.empty")}
											</p>
										</Show>
										<Drawer.Footer class="-mx-4 md:-mx-6">
											<div class="flex flex-wrap items-center gap-3">
												<Button
													type="button"
													variant="outline"
													size="md"
													class="gap-2"
													onClick={() => setStep("target")}
												>
													<FaSolidArrowLeft size={12} />
													<span>{T()("common.back")}</span>
												</Button>
												<p class="text-sm text-subtitle">
													{selectedFieldKey() ? 1 : 0}{" "}
													{T()("common.selected").toLowerCase()}
												</p>
											</div>
											<Drawer.Actions>
												<Button
													type="button"
													variant="outline"
													size="md"
													onClick={() => props.state.setOpen(false)}
												>
													{T()("common.close")}
												</Button>
												<Button
													type="button"
													variant="primary"
													size="md"
													onClick={confirmSelection}
													disabled={!selectedFieldKey()}
												>
													{T()("common.confirm")}
												</Button>
											</Drawer.Actions>
										</Drawer.Footer>
									</div>
								</Show>
							</div>
						</div>
					</Drawer.Body>
				</>
			)}
		</Drawer.Root>
	);
};

const VariableSourceSelect: Component<{
	source: VariableSource;
	options: Array<{ value: VariableSource; label: string }>;
	onChange: (source: VariableSource) => void;
}> = (props) => (
	<div class="w-44 max-w-full">
		<Select
			id="rich-text-variable-source"
			name="rich-text-variable-source"
			value={props.source}
			onChange={(value) => {
				if (value === "document" || value === "user") props.onChange(value);
			}}
			options={props.options}
			ariaLabel={T()("common.type")}
			noClear
			small
		/>
	</div>
);

const getUserFieldLabel = (fieldKey: RichTextUserVariableField): string => {
	switch (fieldKey) {
		case "firstName":
			return T()("common.first.name");
		case "lastName":
			return T()("common.last.name");
		case "username":
			return T()("common.username");
		case "email":
			return T()("common.email");
	}
};

export default RichTextVariableSelectDrawer;
