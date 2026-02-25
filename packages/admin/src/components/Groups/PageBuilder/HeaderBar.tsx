import type { CollectionResponse, DocumentResponse } from "@types";
import classNames from "classnames";
import {
	FaSolidCalendarPlus,
	FaSolidClock,
	FaSolidLanguage,
	FaSolidRotate,
} from "solid-icons/fa";
import type { Accessor } from "solid-js";
import { type Component, createMemo, onCleanup, onMount, Show } from "solid-js";
import { Breadcrumbs as LayoutBreadcrumbs } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import DateText from "@/components/Partials/DateText";
import Spinner from "@/components/Partials/Spinner";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import contentLocaleStore from "@/store/contentLocaleStore";
import userPreferencesStore from "@/store/userPreferencesStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { DocumentActions } from "./DocumentActions";
import { ReleaseTrigger, type ReleaseTriggerOption } from "./ReleaseTrigger";
import { ViewSelector, type ViewSelectorOption } from "./ViewSelector";

export const HeaderBar: Component<{
	mode: "create" | "edit" | undefined;
	version?: Accessor<"latest" | string>;
	versionId?: Accessor<number | undefined>;
	state: {
		collection: Accessor<CollectionResponse | undefined>;
		collectionKey: Accessor<string>;
		collectionName: Accessor<string>;
		collectionSingularName: Accessor<string>;
		documentID: Accessor<number | undefined>;
		document: Accessor<DocumentResponse | undefined>;
		ui: UseDocumentUIState;
		autoSave?: UseDocumentAutoSave;
		autoSaveUserEnabled?: Accessor<boolean>;
		showRevisionNavigation: UseDocumentUIState["showRevisionNavigation"];
		isDocumentMutated?: Accessor<boolean>;
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseDocumentMutations["restoreRevisionAction"];
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let stickyBarRef: HTMLDivElement | undefined;

	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return contentLocaleStore.get.locales.find((locale) => locale.isDefault);
	});
	const displayLocale = createMemo(() => {
		return defaultLocale() ?? contentLocaleStore.get.locales[0];
	});
	const hasMultipleLocales = createMemo(() => {
		return contentLocaleStore.get.locales.length > 1;
	});
	const viewOptions = createMemo(() => {
		const options: ViewSelectorOption[] = [
			{
				label: T()("latest"),
				disabled: false,
				type: "latest",
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
				}),
			},
		];

		if (
			props.version?.() === "revision" &&
			props.state.documentID() !== undefined
		) {
			options.push({
				label: `${T()("revision")} #${props.versionId?.()}`,
				disabled: false,
				type: "link",
				hideInDropdown: true,
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					status: "revision",
					versionId: props.versionId?.(),
				}),
			});
		}

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
					upToDate:
						props.state.document()?.version[environment.key]?.contentId ===
						props.state.document()?.version.latest?.contentId,
				},
			});
		}

		if (props.state.showRevisionNavigation()) {
			options.push({
				label: T()("revision_history"),
				disabled: props.state.documentID() === undefined,
				type: "link",
				location:
					props.state.documentID() !== undefined
						? `/lucid/collections/${props.state.collectionKey()}/${props.state.documentID()}/history`
						: "#",
			});
		}

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

			const isPromoted =
				props.state.document()?.version[environment.key]?.contentId ===
				props.state.document()?.version.latest?.contentId;

			return {
				label,
				value: environment.key as ReleaseTriggerOption["value"],
				route: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					status: environment.key,
				}),
				disabled: isPromoted,
				status: {
					isReleased: !!document.version?.[environment.key],
					upToDate: isPromoted,
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
	const showAutoSaveToggle = createMemo(() => {
		return (
			props.state.collection()?.config.useAutoSave === true &&
			props.mode === "edit"
		);
	});
	const isSavingOrAutoSaving = createMemo(() => {
		return (
			props.state.ui.isSaving?.() ||
			props.state.ui.isAutoSaving?.() ||
			props.state.ui.isPromotingToPublished?.()
		);
	});

	// ----------------------------------
	// Effects
	onMount(() => {
		if (!stickyBarRef) return;

		const updateHeight = () => {
			if (stickyBarRef) {
				const height = stickyBarRef.offsetHeight;
				document.documentElement.style.setProperty(
					"--document-header-bar-height",
					`${height}px`,
				);
			}
		};

		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(stickyBarRef);
		updateHeight();

		onCleanup(() => {
			resizeObserver.disconnect();
			document.documentElement.style.removeProperty(
				"--document-header-bar-height",
			);
		});
	});

	// ----------------------------------
	// Render
	return (
		<>
			<div class="w-full -mt-4 px-4 md:px-6 pt-6 bg-background-base border-x border-border">
				<div class="flex md:items-center md:justify-between gap-3 w-full text-sm">
					<div class="flex-1 min-w-0">
						<LayoutBreadcrumbs
							breadcrumbs={[
								{
									link: "/lucid/collections",
									label: T()("collections"),
								},
								{
									link: `/lucid/collections/${props.state.collectionKey()}`,
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
					<Show when={props.mode === "edit"}>
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 shrink-0 text-xs md:text-sm">
							<div class="hidden lg:flex items-center gap-x-3 gap-y-1.5 flex-wrap">
								<div class="flex items-center gap-1.5 text-body">
									<FaSolidCalendarPlus size={12} />
									<DateText date={props.state.document()?.createdAt} />
								</div>
								<div class="flex items-center gap-1.5 text-body">
									<FaSolidClock size={12} />
									<DateText date={props.state.document()?.updatedAt} />
								</div>
							</div>
							<Show when={showAutoSaveToggle()}>
								<button
									type="button"
									onClick={() => userPreferencesStore.get.toggleAutoSave()}
									class={classNames(
										"flex items-center justify-center w-6 h-6 rounded transition-colors",
										{
											"text-primary-base hover:text-primary-hover":
												props.state.autoSaveUserEnabled?.(),
											"text-body/40 hover:text-body":
												!props.state.autoSaveUserEnabled?.(),
										},
									)}
									title={
										props.state.autoSaveUserEnabled?.()
											? `${T()("auto_save")} - ${T()("enabled")}`
											: `${T()("auto_save")} - ${T()("disabled")}`
									}
								>
									<FaSolidRotate size={12} />
								</button>
							</Show>
						</div>
					</Show>
				</div>
			</div>
			<div
				ref={stickyBarRef}
				class="sticky top-0 z-30 w-full px-4 md:px-6 py-4 md:py-6 bg-background-base border-x border-b border-border rounded-b-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-2.5"
			>
				<Show when={isSavingOrAutoSaving()}>
					<div class="absolute inset-2 z-50 bg-white/5 rounded-md flex items-center justify-center pointer-events-auto animate-pulse">
						<div class="flex items-center gap-2.5">
							<Spinner size="sm" />
							<span class="sr-only">{T()("saving")}</span>
						</div>
					</div>
				</Show>
				<div class="flex items-center gap-2.5 w-full lg:w-auto">
					<div class="flex flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2">
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
								<ViewSelector
									options={viewOptions}
									isDocumentMutated={props.state.isDocumentMutated}
								/>
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
				<Show
					when={
						props.state.ui.showUpsertButton?.() ||
						props.state.ui.showDeleteButton?.() ||
						props.state.ui.showRestoreRevisionButton?.() ||
						props.mode !== undefined
					}
				>
					<div class="flex md:flex-wrap md:items-center gap-2.5 justify-end w-full lg:w-auto">
						<Show when={props.mode !== undefined}>
							<div class="flex items-center gap-2.5 w-full md:flex-1 md:min-w-0">
								<Show
									when={
										props.state.collection()?.config.useTranslations &&
										hasMultipleLocales()
									}
								>
									<div class="flex-1 min-w-0 lg:flex-none lg:w-54">
										<ContentLocaleSelect
											hasError={props.state.ui.brickTranslationErrors?.()}
											showShortcut={true}
										/>
									</div>
								</Show>
								<Show
									when={
										(props.state.collection()?.config.useTranslations !==
											true ||
											!hasMultipleLocales()) &&
										displayLocale()
									}
								>
									<div class="flex items-center">
										<FaSolidLanguage size={20} />
										<span class="ml-2.5 text-base font-medium text-body">
											{displayLocale()?.name} ({displayLocale()?.code})
										</span>
									</div>
								</Show>
							</div>
						</Show>
						<div class="flex items-center gap-2.5 w-auto ml-auto">
							<Show when={props.state.ui.showUpsertButton?.()}>
								<ReleaseTrigger
									options={releaseOptions}
									onSelect={async (option) => {
										props.state.autoSave?.debouncedAutoSave.clear();
										props.state.ui.setReleaseEnvironmentTarget(option.value);
										props.state.ui.setReleaseEnvironmentOpen(true);
									}}
									onSave={() => {
										props.state.autoSave?.debouncedAutoSave.clear();
										props.actions?.upsertDocumentAction?.();
									}}
									saveDisabled={props.state.ui.saveDisabled?.()}
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
							<Show when={props.state.ui.showRestoreRevisionButton?.()}>
								<Button
									type="button"
									theme="secondary"
									size="small"
									onClick={() => {
										const versionId = props.versionId?.();
										if (!versionId) return;
										props.state.ui.setRestoreRevisionVersionId(versionId);
										props.state.ui.setRestoreRevisionOpen(true);
									}}
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
				</Show>
			</div>
		</>
	);
};
