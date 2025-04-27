import T from "@/translations";
import { createMemo, Show, type Component } from "solid-js";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";
import contentLocaleStore from "@/store/contentLocaleStore";
import DateText from "@/components/Partials/DateText";
import { FaSolidLanguage, FaSolidTrash } from "solid-icons/fa";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { CollectionResponse, DocumentResponse } from "@types";
import type { UseRevisionsState } from "@/hooks/document/useRevisionsState";
import type { UseRevisionMutations } from "@/hooks/document/useRevisionMutations";

export const ActionBar: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "draft" | "published";
	state: {
		collection: CollectionResponse | undefined;
		document: DocumentResponse | undefined;
		selectedRevision?: UseRevisionsState["documentId"];
		ui: UseDocumentUIState;
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
		<div class="sticky top-0 z-30 w-full px-5 py-2.5 gap-x-5 gap-y-15 bg-container-3 border border-border rounded-b-xl flex flex-wrap items-center justify-between">
			<div class="flex items-center gap-2.5">
				<Show when={props.version}>
					<div>
						<span class="font-medium mr-1">{T()("status")}:</span>
						<span>{props.version}</span>
					</div>
				</Show>
				<Show when={props.mode !== "create"}>
					<div>
						<span class="font-medium mr-1">{T()("created")}:</span>
						<DateText date={props.state.document?.createdAt} />
					</div>
					<div>
						<span class="font-medium mr-1">{T()("modified")}:</span>
						<DateText date={props.state.document?.updatedAt} />
					</div>
				</Show>
			</div>
			<div class="flex items-center gap-2.5">
				{/* Locale Select */}
				<Show when={props.state.collection?.config.useTranslations}>
					<div class="w-58">
						<ContentLocaleSelect
							hasError={props.state.ui.brickTranslationErrors?.()}
							showShortcut={true}
						/>
					</div>
				</Show>
				{/* Default Locale */}
				<Show
					when={
						props.state.collection?.config.useTranslations !== true &&
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
				{/* Upsert doc */}
				<Show when={props.state.ui.showUpsertButton?.()}>
					<Button
						type="button"
						theme="secondary"
						size="x-small"
						onClick={props.actions?.upsertDocumentAction}
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
						onClick={() =>
							props.actions?.publishDocumentAction?.(props.state.document)
						}
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
	);
};
