import T from "@/translations";
import { createMemo, Show, type Component, type Accessor } from "solid-js";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";
import contentLocaleStore from "@/store/contentLocaleStore";
import DateText from "@/components/Partials/DateText";
import {
	FaSolidLanguage,
	FaSolidTrash,
	FaSolidFloppyDisk,
	FaSolidClock,
	FaSolidCalendarPlus,
	FaSolidCircle,
} from "solid-icons/fa";
import Spinner from "@/components/Partials/Spinner";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { CollectionResponse, DocumentResponse } from "@types";
import type { UseRevisionsState } from "@/hooks/document/useRevisionsState";
import type { UseRevisionMutations } from "@/hooks/document/useRevisionMutations";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import classNames from "classnames";

export const ActionBar: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "draft" | "published";
	state: {
		collection: Accessor<CollectionResponse | undefined>;
		document: Accessor<DocumentResponse | undefined>;
		selectedRevision?: UseRevisionsState["documentId"];
		ui: UseDocumentUIState;
		autoSave?: UseDocumentAutoSave;
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseRevisionMutations["restoreRevisionAction"];
	};
}> = (props) => {
	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find((locale) => locale.isDefault);
	});

	// ----------------------------------
	// Render
	return (
		<div class="sticky top-0 z-30 w-full px-5 py-4 gap-x-5 gap-y-2.5 bg-container-3 border border-border rounded-b-xl flex flex-col flex-wrap">
			<div class="flex items-center gap-3 w-full text-sm overflow-x-auto">
				<div class="flex items-center gap-1">
					<Show when={props.mode === "edit" || props.mode === "revisions"}>
						<div class="flex items-center gap-1.5 px-2.5 py-1 bg-container-1 rounded-md border border-border/50">
							<FaSolidCircle
								size={12}
								class={classNames({
									"text-green-600": props.version === "published",
									"text-amber-600": props.version === "draft",
									"text-yellow-400": props.mode === "revisions",
								})}
							/>
							<span class="font-medium text-title lowercase">
								{props.version ?? T()("revision")}
							</span>
						</div>
					</Show>
					<Show when={props.version && props.mode === "create"}>
						<div class="flex items-center gap-1.5 px-2.5 py-1 bg-container-1 rounded-md border border-border/50">
							<FaSolidCircle size={12} class={"text-red-600"} />
							<span class="font-medium text-title">{T()("unsaved")}</span>
						</div>
					</Show>
					<Show when={props.state.ui.useAutoSave?.()}>
						<div class="flex relative items-center gap-1.5 px-2.5 py-1 bg-container-1 rounded-md border border-border/50">
							<FaSolidFloppyDisk size={12} class="text-body" />
							<span class="text-body">
								{props.state.ui.hasAutoSavePermission?.()
									? T()("enabled")
									: T()("disabled")}
							</span>
							<Show when={props.state.ui.isAutoSaving?.()}>
								<div class="absolute inset-0 flex items-center justify-center bg-container-1 rounded-md">
									<Spinner size="sm" />
								</div>
							</Show>
						</div>
					</Show>
				</div>
				<Show when={props.mode !== "create"}>
					<div class="flex items-center gap-1.5 text-body">
						<FaSolidCalendarPlus size={12} />
						<span class="text-sm">{T()("created")}:</span>
						<DateText date={props.state.document()?.createdAt} />
					</div>
					<div class="flex items-center gap-1.5 text-body">
						<FaSolidClock size={12} />
						<span class="text-sm">{T()("modified")}:</span>
						<DateText date={props.state.document()?.updatedAt} />
					</div>
				</Show>
			</div>
			<div class="flex items-center gap-2.5 w-full">
				<div class="flex items-center gap-2.5 w-full justify-between">
					{/* Locale Select */}
					<Show when={props.state.collection()?.config.useTranslations}>
						<div class="w-full">
							<ContentLocaleSelect
								hasError={props.state.ui.brickTranslationErrors?.()}
								showShortcut={true}
							/>
						</div>
					</Show>
					{/* Default Locale */}
					<Show
						when={
							props.state.collection()?.config.useTranslations !== true &&
							defaultLocale()
						}
					>
						<div class="flex items-center">
							<FaSolidLanguage size={20} />
							<span class="ml-2.5 text-base font-medium text-title">
								{defaultLocale()?.name} ({defaultLocale()?.code})
							</span>
						</div>
					</Show>
				</div>
				<div class="flex items-center gap-2.5">
					{/* Upsert doc */}
					<Show when={props.state.ui.showUpsertButton?.()}>
						<Button
							type="button"
							theme="secondary"
							size="x-small"
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
					{/* Publish doc */}
					<Show when={props.state.ui.showPublishButton?.()}>
						<Button
							type="button"
							theme="secondary"
							size="x-small"
							onClick={() => {
								props.state.autoSave?.debouncedAutoSave.clear();
								props.actions?.publishDocumentAction?.(props.state.document());
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
							size="x-small"
							onClick={props.actions.restoreRevisionAction}
							disabled={props.state.selectedRevision?.() === undefined}
							permission={props.state.ui.hasRestorePermission?.()}
						>
							{T()("restore_revision")}
						</Button>
					</Show>
					{/* Delete doc */}
					<Show when={props.state.ui.showDeleteButton?.()}>
						<Button
							theme="input-style"
							size="x-icon"
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
			<Show when={props.state.ui.isSaving()}>
				<div class="absolute inset-0 bg-black/60 z-50 flex items-center justify-center rounded-b-xl gap-2.5">
					<Spinner size="sm" />
					<span class="text-body">{T()("saving")}</span>
				</div>
			</Show>
		</div>
	);
};
