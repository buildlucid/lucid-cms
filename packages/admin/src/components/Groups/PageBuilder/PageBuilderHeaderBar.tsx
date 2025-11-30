import T from "@/translations";
import { type Component, Show, createMemo } from "solid-js";
import { Breadcrumbs as LayoutBreadcrumbs } from "@/components/Groups/Layout";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";
import { PillNavigation } from "@/components/Partials/PillNavigation";
import contentLocaleStore from "@/store/contentLocaleStore";
import DateText from "@/components/Partials/DateText";
import {
	FaSolidLanguage,
	FaSolidTrash,
	FaSolidFloppyDisk,
	FaSolidClock,
	FaSolidCalendarPlus,
} from "solid-icons/fa";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { CollectionResponse, DocumentResponse } from "@types";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import { getDocumentRoute } from "@/utils/route-helpers";
import { useNavigate } from "@solidjs/router";
import type { Accessor } from "solid-js";
import type { UseRevisionsState } from "@/hooks/document/useRevisionsState";
import type { UseRevisionMutations } from "@/hooks/document/useRevisionMutations";

export const PageBuilderHeaderBar: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "latest" | string;
	state: {
		collection: Accessor<CollectionResponse | undefined>;
		collectionKey: Accessor<string>;
		collectionName: Accessor<string>;
		collectionSingularName: Accessor<string>;
		documentID: Accessor<number | undefined>;
		document: Accessor<DocumentResponse | undefined>;
		ui: UseDocumentUIState;
		autoSave?: UseDocumentAutoSave;
		showRevisionNavigation: UseDocumentUIState["showRevisionNavigation"];
		selectedRevision?: UseRevisionsState["documentId"];
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseRevisionMutations["restoreRevisionAction"];
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const navigate = useNavigate();

	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find((locale) => locale.isDefault);
	});

	// ----------------------------------
	// Derived
	const draftLink = () =>
		getDocumentRoute("edit", {
			collectionKey: props.state.collectionKey(),
			documentId: props.state.documentID(),
			status: props.version,
		});

	const publishedLink = () =>
		props.state.documentID() !== undefined
			? `/admin/collections/${props.state.collectionKey()}/published/${props.state.documentID()}`
			: "#";

	const revisionsLink = () =>
		props.state.documentID() !== undefined
			? `/admin/collections/${props.state.collectionKey()}/revisions/${props.state.documentID()}/latest`
			: "#";

	// ----------------------------------
	// Render
	return (
		<>
			<div class="w-full -mt-4 px-4 md:px-6 pt-6 bg-background-base border-x border-border">
				<div class="flex items-center justify-between gap-3 w-full text-sm">
					<div class="flex-1 min-w-0">
						<LayoutBreadcrumbs
							breadcrumbs={[
								{
									link: "/admin/collections",
									label: T()("collections"),
								},
								{
									link: `/admin/collections/${props.state.collectionKey()}`,
									label: props.state.collectionName(),
								},
								{
									link: draftLink(),
									label:
										props.mode === "create"
											? T()("create")
											: `${T()("document")} #${props.state.documentID()}`,
								},
							]}
							options={{
								noBorder: true,
								noPadding: true,
							}}
						/>
					</div>
					<Show when={props.mode !== "create"}>
						<div class="flex items-center gap-3 shrink-0">
							<div class="flex items-center gap-1.5 text-body">
								<FaSolidCalendarPlus size={12} />
								<DateText date={props.state.document()?.createdAt} />
							</div>
							<div class="flex items-center gap-1.5 text-body">
								<FaSolidClock size={12} />
								<DateText date={props.state.document()?.updatedAt} />
							</div>
						</div>
					</Show>
				</div>
			</div>
			<div class="sticky top-0 z-30 w-full px-4 md:px-6 py-4 md:py-6 bg-background-base border-x border-b border-border rounded-b-xl flex items-center justify-between gap-2.5 ">
				<div class="flex items-center gap-2.5">
					<PillNavigation
						items={[
							{
								label: T()("draft"),
								active: props.version === "draft",
								disabled:
									props.mode === "create" ||
									props.state.documentID() === undefined,
								show: props.version === "latest",
								onClick: () => {
									if (
										props.mode === "create" ||
										props.state.documentID() === undefined
									) {
										return;
									}
									navigate(draftLink());
								},
							},
							{
								label: T()("revisions"),
								active: props.mode === "revisions",
								disabled: props.state.documentID() === undefined,
								show: props.state.showRevisionNavigation(),
								onClick: () => {
									if (props.state.documentID() === undefined) {
										return;
									}
									navigate(revisionsLink());
								},
							},
						]}
					/>
				</div>
				<div class="flex items-center gap-2.5 justify-end">
					<div class="flex items-center gap-2.5 w-full justify-between">
						<Show when={props.state.collection()?.config.useTranslations}>
							<div class="w-54">
								<ContentLocaleSelect
									hasError={props.state.ui.brickTranslationErrors?.()}
								/>
							</div>
						</Show>
						<Show
							when={
								props.state.collection()?.config.useTranslations !== true &&
								defaultLocale()
							}
						>
							<div class="flex items-center">
								<FaSolidLanguage size={20} />
								<span class="ml-2.5 text-base font-medium text-body">
									{defaultLocale()?.name} ({defaultLocale()?.code})
								</span>
							</div>
						</Show>
					</div>
					<div class="flex items-center gap-2.5">
						<Show when={props.state.ui.showUpsertButton?.()}>
							<Button
								type="button"
								theme="secondary"
								size="small"
								onClick={() => {
									props.state.autoSave?.debouncedAutoSave.clear();
									props.actions?.upsertDocumentAction?.();
								}}
								disabled={props.state.ui.canSaveDocument?.()}
								permission={props.state.ui.hasSavePermission?.()}
							>
								{T()("save")}
							</Button>
						</Show>
						<Show when={props.state.ui.showPublishButton?.()}>
							<Button
								type="button"
								theme="secondary"
								size="small"
								onClick={() => {
									props.state.autoSave?.debouncedAutoSave.clear();
									props.actions?.publishDocumentAction?.(
										props.state.document(),
									);
								}}
								disabled={!props.state.ui.canPublishDocument?.()}
								permission={props.state.ui.hasPublishPermission?.()}
							>
								{T()("publish")}
							</Button>
						</Show>
						{/* Restore revision */}
						<Show when={props.state.ui.showRestoreRevisionButton?.()}>
							<Button
								type="button"
								theme="secondary"
								size="small"
								onClick={props.actions?.restoreRevisionAction}
								disabled={props.state.selectedRevision?.() === undefined}
								permission={props.state.ui.hasRestorePermission?.()}
							>
								{T()("restore_revision")}
							</Button>
						</Show>
						<Show when={props.state.ui.showDeleteButton?.()}>
							<Button
								theme="border-outline"
								size="icon"
								type="button"
								onClick={() => props.state.ui?.setDeleteOpen?.(true)}
								permission={props.state.ui.hasDeletePermission?.()}
							>
								<span class="sr-only">{T()("delete")}</span>
								<FaSolidTrash />
							</Button>
						</Show>
					</div>
				</div>

				{/* <Show when={props.state.ui.isSaving()}>
					<div class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center rounded-b-xl gap-2.5">
						<Spinner size="sm" />
						<span class="text-body">{T()("saving")}</span>
					</div>
				</Show> */}
			</div>
		</>
	);
};
