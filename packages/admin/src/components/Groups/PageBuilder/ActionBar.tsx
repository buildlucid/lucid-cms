import T from "@/translations";
import { type Accessor, createMemo, Show, type Component } from "solid-js";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import { FaSolidLanguage, FaSolidTrash } from "solid-icons/fa";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/document/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import DateText from "@/components/Partials/DateText";

export const ActionBar: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "draft" | "published";
	hooks: {
		mutations: UseDocumentMutations;
		state: UseDocumentState;
		uiState: UseDocumentUIState;
	};

	// TODO: move all of bellow to optional revision hook
	selectedRevision?: Accessor<number | undefined>;
	restoreRevisionAction?: () => void;
}> = (props) => {
	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find((locale) => locale.isDefault);
	});

	// TODO: move to optional revision hook
	const showRestoreRevisionButton = createMemo(() => {
		if (props.mode !== "revisions") return false;
		if (props.selectedRevision?.() === undefined) return false;
		if (!props?.restoreRevisionAction) return false;
		return true;
	});
	// TODO: move to optional revision hook
	const hasRestorePermission = createMemo(() => {
		return userStore.get.hasPermission(["restore_content"]).all;
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
				<Show when={props.mode === "edit"}>
					<div>
						<span class="font-medium mr-1">{T()("created")}:</span>
						<DateText date={props.hooks.state.doc.data?.data.createdAt} />
					</div>
					<div>
						<span class="font-medium mr-1">{T()("modified")}:</span>
						<DateText date={props.hooks.state.doc.data?.data.updatedAt} />
					</div>
				</Show>
			</div>
			<div class="flex items-center gap-2.5">
				{/* Locale Select */}
				<Show
					when={props.hooks.state.collection.data?.data?.config.useTranslations}
				>
					<div class="w-52">
						<ContentLocaleSelect
							hasError={props.hooks.uiState.brickTranslationErrors?.()}
						/>
					</div>
				</Show>
				{/* Default Locale */}
				<Show
					when={
						props.hooks.state.collection.data?.data?.config.useTranslations !==
							true && defaultLocale()
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
				<Show when={props.hooks.uiState.showUpsertButton()}>
					<Button
						type="button"
						theme="secondary"
						size="x-small"
						onClick={props.hooks.mutations?.upsertDocumentAction}
						disabled={props.hooks.uiState.canSaveDocument?.()}
						permission={props.hooks.uiState.hasSavePermission()}
					>
						{T()("save")}
					</Button>
				</Show>
				{/* Publish doc */}
				<Show when={props.hooks.uiState.showPublishButton()}>
					<Button
						type="button"
						theme="secondary"
						size="x-small"
						onClick={() =>
							props.hooks.mutations?.publishDocumentAction(
								props.hooks.state.doc.data?.data,
							)
						}
						disabled={!props.hooks.uiState.canPublishDocument()}
						permission={props.hooks.uiState.hasPublishPermission()}
					>
						{T()("publish")}
					</Button>
				</Show>
				{/* Restore revision */}
				<Show when={showRestoreRevisionButton()}>
					<Button
						type="button"
						theme="primary"
						size="x-small"
						onClick={props.restoreRevisionAction}
						disabled={props.selectedRevision?.() === undefined}
						permission={hasRestorePermission()}
					>
						{T()("restore_revision")}
					</Button>
				</Show>
				{/* Delete doc */}
				<Show when={props.hooks.uiState.showDeleteButton()}>
					<Button
						theme="input-style"
						size="x-icon"
						type="button"
						onClick={() => props.hooks.uiState?.setDeleteOpen?.(true)}
						permission={props.hooks.uiState.hasDeletePermission()}
					>
						<span class="sr-only">{T()("delete")}</span>
						<FaSolidTrash />
					</Button>
				</Show>
			</div>
		</div>
	);
};
