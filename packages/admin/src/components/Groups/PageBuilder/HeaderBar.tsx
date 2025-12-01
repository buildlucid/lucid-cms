import T from "@/translations";
import { type Component, Show, createMemo } from "solid-js";
import { Breadcrumbs as LayoutBreadcrumbs } from "@/components/Groups/Layout";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";
import { ViewSelector, type ViewSelectorOption } from "./ViewSelector";
import { ReleaseTrigger, type ReleaseTriggerOption } from "./ReleaseTrigger";
import { DocumentActions } from "./DocumentActions";
import contentLocaleStore from "@/store/contentLocaleStore";
import DateText from "@/components/Partials/DateText";
import {
	FaSolidLanguage,
	FaSolidClock,
	FaSolidCalendarPlus,
} from "solid-icons/fa";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { CollectionResponse, DocumentResponse } from "@types";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { Accessor } from "solid-js";
import type { UseRevisionsState } from "@/hooks/document/useRevisionsState";
import type { UseRevisionMutations } from "@/hooks/document/useRevisionMutations";
import helpers from "@/utils/helpers";
import { useNavigate } from "@solidjs/router";

export const HeaderBar: Component<{
	mode: "create" | "edit" | "revisions";
	version?: Accessor<"latest" | string>;
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
	// State / Hooks
	const navigate = useNavigate();

	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find((locale) => locale.isDefault);
	});
	const viewOptions = createMemo(() => {
		const options: ViewSelectorOption[] = [
			{
				label: "Latest",
				disabled: false,
				type: "latest",
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
				}),
			},
		];

		for (const environment of props.state.collection()?.config.environments ??
			[]) {
			const isPublished = !!props.state.document()?.version[environment.key];

			options.push({
				label: helpers.getLocaleValue({ value: environment.name }),
				disabled: !isPublished,
				type: "environment",
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					status: environment.key,
				}),
				status: {
					isPublished: isPublished,
				},
			});
		}

		options.push({
			label: T()("revisions"),
			disabled: props.state.documentID() === undefined,
			type: "revision",
			location:
				props.state.documentID() !== undefined
					? `/admin/collections/${props.state.collectionKey()}/revision/${props.state.documentID()}/latest`
					: "#",
		});

		return options;
	});
	const releaseOptions = createMemo<ReleaseTriggerOption[]>(() => {
		if (props.state.ui.showPublishButton?.() === false) return [];
		const collection = props.state.collection();
		const document = props.state.document();
		if (!collection || !document) return [];

		const environments = collection.config.environments ?? [];

		return environments.map((environment) => {
			const label =
				helpers.getLocaleValue({ value: environment.name }) || environment.key;
			// TODO: re-able this when we have a way to determine if auto-saved versions match the environment. Currently if you auto-save, what we have bellow would return true still, despite the content now being out of sync.
			// const isPromoted =
			// 	props.state.document()?.version[environment.key]?.promotedFrom ===
			// 	props.state.document()?.versionId;
			return {
				label,
				value: environment.key as ReleaseTriggerOption["value"],
				route: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					status: environment.key,
				}),
				// disabled: isPromoted,
				status: {
					isReleased: !!document.version?.[environment.key],
					// upToDate: isPromoted,
				},
			};
		});
	});
	const showViewSelector = createMemo(() => {
		const collection = props.state.collection();
		if (!collection) return false;

		const environments = collection.config.environments ?? [];

		return (
			props.mode !== "create" &&
			(collection.config.useRevisions || environments.length > 0)
		);
	});

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
									link: getDocumentRoute("edit", {
										collectionKey: props.state.collectionKey(),
										documentId: props.state.documentID(),
										status: props.version?.(),
									}),
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
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<Show when={props.mode === "create"}>
								<h2 class="text-base font-medium text-title">
									{T()("create_document", {
										collectionSingle: props.state.collectionSingularName(),
									})}
								</h2>
							</Show>
							<Show when={props.mode !== "create"}>
								<h2 class="text-base font-medium text-title">
									{props.state.collectionName()}
								</h2>
							</Show>
							<Show when={showViewSelector()}>
								<ViewSelector options={viewOptions} />
							</Show>
						</div>
						<Show when={props.state.collection()?.details.summary}>
							<p class="text-sm text-body">
								{helpers.getLocaleValue({
									value: props.state.collection()?.details.summary,
								})}
							</p>
						</Show>
					</div>
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
							<ReleaseTrigger
								options={releaseOptions}
								onSelect={(option) => {
									props.state.autoSave?.debouncedAutoSave.clear();
									props.actions?.publishDocumentAction?.(option.value);
									navigate(option.route);
								}}
								onSave={() => {
									props.state.autoSave?.debouncedAutoSave.clear();
									props.actions?.upsertDocumentAction?.();
								}}
								saveDisabled={props.state.ui.canSaveDocument?.()}
								savePermission={props.state.ui.hasSavePermission?.()}
								disabled={!props.state.ui.canPublishDocument?.()}
								permission={props.state.ui.hasPublishPermission?.()}
								loading={
									props.state.ui.isSaving?.() ||
									props.state.ui.isAutoSaving?.() ||
									props.state.ui.isPromotingToPublished?.()
								}
							/>
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
							<DocumentActions
								onDelete={() => props.state.ui?.setDeleteOpen?.(true)}
								deletePermission={props.state.ui.hasDeletePermission?.()}
							/>
						</Show>
					</div>
				</div>
			</div>
		</>
	);
};
