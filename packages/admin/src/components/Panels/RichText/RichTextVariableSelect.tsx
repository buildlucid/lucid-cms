import { isFieldTypeRichTextVariable } from "@field-capabilities";
import type { DocumentRef, RichTextUserVariableField, UserRef } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import {
	getRichTextUserFieldText,
	isRichTextUserVariableField,
} from "@/components/Groups/Form/RichText/helpers";
import type {
	RichTextVariableReference,
	RichTextVariableSelection,
} from "@/components/Groups/Form/RichText/types";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import {
	type AnimatedTabItem,
	AnimatedTabs,
} from "@/components/Partials/AnimatedTabs";
import api from "@/services/api";
import T from "@/translations";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import { formatDocumentFieldValue } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { DocumentSelectContent } from "../Documents/DocumentSelect";
import { UserSelectContent } from "../User/UserSelect";
import RichTextVariableFieldSelect, {
	type RichTextVariableFieldOption,
} from "./RichTextVariableFieldSelect";

type VariableSource = RichTextVariableReference["source"];
type UserReference = NonNullable<UserRef>;

const RichTextVariableSelectPanel: Component<{
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

	// ----------------------------------------
	// Queries
	const collectionKey = createMemo(() => documentRef()?.collectionKey);
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: { collectionKey },
		},
		enabled: () =>
			props.state.open && source() === "document" && !!collectionKey(),
	});

	// ----------------------------------------
	// Memos
	const documentEnabled = createMemo(
		() => props.state.collectionKeys.length > 0,
	);
	const userEnabled = createMemo(() => props.state.userFields.length > 0);
	const sourceTabs = createMemo<AnimatedTabItem[]>(() => {
		const tabs: AnimatedTabItem[] = [];
		if (documentEnabled()) {
			tabs.push({
				key: "document",
				label: T()("common.document"),
				class: "w-full justify-center px-2.5 py-1.5",
			});
		}
		if (userEnabled()) {
			tabs.push({
				key: "user",
				label: T()("common.user"),
				class: "w-full justify-center px-2.5 py-1.5",
			});
		}
		return tabs;
	});
	const documentFields = createMemo(() =>
		(collection.data?.data.fields ?? []).filter(
			(field): field is CollectionLeafFieldConfig =>
				isFieldTypeRichTextVariable(field.type),
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
					collectionLocalized: collection.data?.data.localized === true,
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
	const documentLabel = createMemo(() =>
		T()("editor.rich.text.document.fallback", {
			collection: documentRef()?.collectionKey,
			id: documentRef()?.id,
		}),
	);
	const userLabel = createMemo(() => {
		const user = userRef();
		if (!user) return "";
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
		return name ? `${name} · ${user.username}` : user.username;
	});

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
		<BottomPanel
			zIndex={props.state.zIndex}
			state={{ open: props.state.open, setOpen: props.state.setOpen }}
			fetchState={{
				isLoading:
					source() === "document" && step() === "field" && collection.isLoading,
				isError:
					source() === "document" && step() === "field" && collection.isError,
			}}
			langauge={{
				contentLocale:
					source() === "document" && collection.data?.data.localized === true,
			}}
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
				<div class="flex h-full min-h-0 flex-col">
					<Show when={sourceTabs().length > 1}>
						<AnimatedTabs
							items={sourceTabs()}
							activeKey={source()}
							onSelect={(key) => {
								if (key === "document" || key === "user") changeSource(key);
							}}
							class="mb-4 shrink-0"
							listClass="w-full gap-1 [&>li]:grow"
							indicatorClass="shadow-xs"
							fullWidth
						/>
					</Show>

					<div class="min-h-0 grow">
						<Show
							when={step() === "field"}
							fallback={
								<Show
									when={source() === "document"}
									fallback={
										<UserSelectContent
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
							<RichTextVariableFieldSelect
								targetLabel={
									source() === "document" ? documentLabel() : userLabel()
								}
								viewTarget={
									source() === "document" && documentRef()
										? {
												label: T()("editor.rich.text.variable.view.document"),
												href: getDocumentRoute("edit", {
													collectionKey: documentRef()?.collectionKey ?? "",
													documentId: documentRef()?.id ?? 0,
												}),
											}
										: undefined
								}
								fields={
									source() === "document"
										? documentFieldOptions(language?.contentLocale?.() ?? "")
										: userFieldOptions()
								}
								selectedFieldKey={selectedFieldKey()}
								emptyLabel={T()("editor.rich.text.variable.select.empty")}
								onBack={() => setStep("target")}
								onSelect={setSelectedFieldKey}
								onConfirm={confirmSelection}
								onClose={() => props.state.setOpen(false)}
							/>
						</Show>
					</div>
				</div>
			)}
		</BottomPanel>
	);
};

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

export default RichTextVariableSelectPanel;
