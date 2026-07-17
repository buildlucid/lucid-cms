import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import classNames from "classnames";
import {
	FaSolidCalendarPlus,
	FaSolidClock,
	FaSolidEye,
	FaSolidEyeSlash,
	FaSolidLanguage,
	FaSolidRotate,
} from "solid-icons/fa";
import type { Accessor } from "solid-js";
import { type Component, createMemo, onCleanup, onMount, Show } from "solid-js";
import { Breadcrumbs as LayoutBreadcrumbs } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import DateText from "@/components/Partials/DateText";
import type { UseDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import userPreferencesStore from "@/store/userPreferencesStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import spawnToast from "@/utils/spawn-toast";
import { AutoSaveStatusPill } from "./AutoSaveStatusPill";
import { DocumentActions } from "./DocumentActions";
import { ReleaseTrigger, type ReleaseTriggerOption } from "./ReleaseTrigger";
import { ViewSelector, type ViewSelectorOption } from "./ViewSelector";

type HeaderBreadcrumb = {
	link?: string;
	label: string;
	include?: boolean;
};

export const HeaderBar: Component<{
	mode: "create" | "edit" | undefined;
	version?: Accessor<"latest" | string>;
	versionId?: Accessor<number | undefined>;
	trailingBreadcrumbs?: Accessor<Array<HeaderBreadcrumb> | undefined>;
	currentViewLabel?: Accessor<string | undefined>;
	state: {
		collection: Accessor<Collection | undefined>;
		collectionKey: Accessor<string>;
		collectionName: Accessor<string>;
		collectionSingularName: Accessor<string>;
		documentID: Accessor<number | undefined>;
		document: Accessor<InternalCollectionDocument | undefined>;
		autoSaveMetadata?: Accessor<DocumentVersionUpdateResponse | null>;
		ui: UseDocumentUIState;
		autoSave?: UseDocumentAutoSave;
		autoSaveUserEnabled?: Accessor<boolean>;
		showRevisionNavigation: UseDocumentUIState["showRevisionNavigation"];
		showPreview?: UseDocumentUIState["showPreview"];
		previewOpen?: UseDocumentUIState["getPreviewOpen"];
		isDocumentMutated?: Accessor<boolean>;
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseDocumentMutations["restoreRevisionAction"];
		togglePreview?: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let stickyBarRef: HTMLDivElement | undefined;

	// -------------------------------
	// Queries & Mutations
	const createPreview = api.documents.useCreatePreview();

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
	const matchingAutoSaveMetadata = createMemo(() => {
		const document = props.state.document();
		const metadata = props.state.autoSaveMetadata?.();
		if (!document || !metadata) return null;
		if (metadata.id !== document.id) return null;
		if (metadata.versionId !== document.versionId) return null;

		return metadata;
	});
	const documentUpdatedAt = createMemo(() => {
		return (
			matchingAutoSaveMetadata()?.updatedAt ?? props.state.document()?.updatedAt
		);
	});
	const versionContentId = (versionType: string) => {
		const metadata = matchingAutoSaveMetadata();
		if (metadata?.versionType === versionType) return metadata.contentId;

		return props.state.document()?.versions[versionType]?.contentId;
	};
	const breadcrumbs = createMemo(() => {
		const documentRoute = getDocumentRoute("edit", {
			collectionKey: props.state.collectionKey(),
			documentId: props.state.documentID(),
		});
		const currentDocumentRoute = getDocumentRoute("edit", {
			collectionKey: props.state.collectionKey(),
			documentId: props.state.documentID(),
			version: props.version?.(),
			versionId: props.versionId?.(),
		});
		const trailing = props.trailingBreadcrumbs?.() ?? [];

		return [
			{
				link: "/lucid",
				label: T()("common.dashboard"),
			},
			{
				link: `/lucid/collections/${props.state.collectionKey()}`,
				label: props.state.collectionName(),
			},
			{
				link: trailing.length > 0 ? documentRoute : currentDocumentRoute,
				label:
					props.mode === "create"
						? T()("common.create")
						: `${T()("media.types.document")} #${props.state.documentID()}`,
			},
			...trailing,
		];
	});
	const viewOptions = createMemo(() => {
		const options: ViewSelectorOption[] = [
			{
				label: T()("common.status.latest"),
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
				label: `${T()("common.revision")} #${props.versionId?.()}`,
				disabled: false,
				type: "link",
				hideInDropdown: true,
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: "revision",
					versionId: props.versionId?.(),
				}),
			});
		}

		if (
			props.version?.() === "snapshot" &&
			props.state.documentID() !== undefined &&
			props.versionId?.() !== undefined
		) {
			options.push({
				label: `${T()("common.snapshot")} #${props.versionId?.()}`,
				disabled: false,
				type: "link",
				hideInDropdown: true,
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: "snapshot",
					versionId: props.versionId?.(),
				}),
			});
		}

		for (const environment of props.state.collection()?.environments ?? []) {
			const isPublished = !!props.state.document()?.versions[environment.key];

			options.push({
				label: helpers.getLocaleValue({ value: environment.name }),
				disabled: !isPublished,
				type: "environment",
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: environment.key,
				}),
				status: {
					isPublished: isPublished,
					upToDate:
						versionContentId(environment.key) === versionContentId("latest"),
				},
			});
		}

		if (props.state.showRevisionNavigation()) {
			options.push({
				label: T()("common.revision.history"),
				disabled: props.state.documentID() === undefined,
				type: "link",
				icon: "history",
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

		const environments = collection.environments ?? [];
		const publishReview = collection.review;
		const workflow = collection.workflow;
		const workflowStage = workflow?.stages.find(
			(stage) => stage.key === document.workflow?.stage,
		);
		const environmentLabels = new Map(
			environments.map((environment) => [
				environment.key,
				helpers.getLocaleValue({ value: environment.name }) || environment.key,
			]),
		);

		return environments.map((environment) => {
			const label = environmentLabels.get(environment.key) || environment.key;

			const isPromoted =
				versionContentId(environment.key) === versionContentId("latest");

			const publishRequestTargetEnabled =
				publishReview?.requiredFor.includes(environment.key) === true;

			const action: ReleaseTriggerOption["action"] = publishRequestTargetEnabled
				? "request"
				: "publish";

			const permission = userStore.get.hasPermission([
				environment.permissions.publish,
			]).all;

			const workflowAllowsTarget =
				!workflow ||
				workflowStage?.publishTargets.includes(environment.key) === true;

			const workflowStageLabel =
				helpers.getLocaleValue({
					value: workflowStage?.name,
					fallback: document.workflow?.stage,
				}) ||
				document.workflow?.stage ||
				T()("documents.workflow.no.stage");

			const workflowDisabled = !workflowAllowsTarget;
			const latestContentId = versionContentId("latest");
			const unmetReleaseRequirementLabels =
				latestContentId === undefined
					? []
					: (environment.requires ?? [])
							.filter(
								(requiredTarget) =>
									versionContentId(requiredTarget) !== latestContentId,
							)
							.map(
								(requiredTarget) =>
									environmentLabels.get(requiredTarget) || requiredTarget,
							);
			const releaseRequirementsDisabled =
				unmetReleaseRequirementLabels.length > 0;

			let disabledToast: ReleaseTriggerOption["disabledToast"];
			if (isPromoted) {
				disabledToast = {
					title: T()("toasts.release.current.disabled.title"),
					message: T()("toasts.release.current.disabled.message", {
						environment: label,
					}),
				};
			} else if (!permission) {
				disabledToast = {
					title: T()("toasts.release.permission.disabled.title"),
					message: T()("toasts.release.permission.disabled.message", {
						environment: label,
					}),
				};
			} else if (workflowDisabled) {
				disabledToast = {
					title: T()("toasts.common.workflow.release.disabled.title"),
					message: T()("toasts.common.workflow.release.disabled.message", {
						stage: workflowStageLabel,
						environment: label.toLowerCase(),
					}),
				};
			} else if (releaseRequirementsDisabled) {
				disabledToast = {
					title: T()("toasts.release.requires.disabled.title"),
					message: T()("toasts.release.requires.disabled.message", {
						environment: label,
						required: unmetReleaseRequirementLabels.join(", "),
					}),
				};
			} else if (
				props.state.ui.isSaving?.() ||
				props.state.ui.isAutoSaving?.()
			) {
				disabledToast = {
					title: T()("toasts.release.saving.disabled.title"),
					message: T()("toasts.release.saving.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.ui.isCreatingPublishOperation?.()) {
				disabledToast = {
					title: T()("toasts.release.requesting.disabled.title"),
					message: T()("toasts.release.requesting.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.isDocumentMutated?.()) {
				disabledToast = {
					title: T()("toasts.release.unsaved.disabled.title"),
					message: T()("toasts.release.unsaved.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.ui.canPublishDocument?.() === false) {
				disabledToast = {
					title: T()("toasts.release.error.disabled.title"),
					message: T()("toasts.release.error.disabled.message", {
						environment: label,
					}),
				};
			}

			return {
				label,
				value: environment.key as ReleaseTriggerOption["value"],
				action,
				route: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: environment.key,
				}),
				disabled: disabledToast !== undefined,
				...(disabledToast ? { disabledToast } : {}),
				status: {
					isReleased: !!document.versions?.[environment.key],
					upToDate: isPromoted,
				},
			};
		});
	});
	const showViewSelector = createMemo(() => {
		const collection = props.state.collection();
		if (!collection) return false;

		const environments = collection.environments ?? [];

		return (
			props.mode !== "create" &&
			(collection.revisions ||
				environments.length > 0 ||
				(collection.review?.requiredFor?.length ?? 0) > 0)
		);
	});
	const showCopyPreview = createMemo(() => {
		const version = props.version?.() ?? "latest";
		const requiresVersionId = version === "revision" || version === "snapshot";

		return (
			props.mode === "edit" &&
			props.state.documentID() !== undefined &&
			(!requiresVersionId || props.versionId?.() !== undefined) &&
			props.state.document()?.isDeleted !== true &&
			props.state.collection()?.capabilities.preview === true
		);
	});
	const scopedPreviewOnly = createMemo(() => {
		const version = props.version?.() ?? "latest";
		return version === "revision" || version === "snapshot";
	});
	const hasPreviewPermission = createMemo(() => {
		const permission = props.state.collection()?.permissions.read;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).some;
	});

	// ----------------------------------
	// Functions
	const copyPreviewUrl = async (mode: PreviewMode) => {
		const documentId = props.state.documentID();
		if (documentId === undefined) return;

		if (props.state.isDocumentMutated?.()) {
			spawnToast({
				title: T()("preview.saved.url.title"),
				message: T()("preview.saved.url.message"),
				status: "warning",
			});
		}

		try {
			const response = await createPreview.action.mutateAsync({
				collectionKey: props.state.collectionKey(),
				documentId,
				versionType: props.version?.() ?? "latest",
				versionId: props.versionId?.(),
				mode,
				locale:
					contentLocaleStore.get.contentLocale ||
					defaultLocale()?.code ||
					undefined,
			});
			if (!response.data.url) {
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}

			await navigator.clipboard.writeText(response.data.url);
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.title"),
				status: "success",
			});
		} catch {
			return;
		}
	};

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
			<div class="w-full -mt-4 px-4 md:px-6 pt-4 mt:pt-6 bg-background-base border-x max-md:border-t border-border max-md:rounded-t-xl max-md:mt-px">
				<div class="flex md:items-center md:justify-between gap-3 w-full text-sm">
					<div class="flex-1 min-w-0">
						<LayoutBreadcrumbs
							breadcrumbs={breadcrumbs()}
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
									<DateText date={documentUpdatedAt()} />
								</div>
							</div>
							<Show when={props.state.ui.hasAutoSavePermission?.()}>
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
											? `${T()("builder.auto.save.label")} - ${T()("common.status.enabled")}`
											: `${T()("builder.auto.save.label")} - ${T()("common.status.disabled")}`
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
				style={{ "view-transition-name": "document-builder-header" }}
				class="sticky top-0 z-30 w-full px-4 md:px-6 py-4 md:py-6 bg-background-base border-x border-b border-border rounded-b-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-2.5"
			>
				<div class="flex items-center gap-2.5 w-full lg:w-auto">
					<div class="flex flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2">
							<Show when={props.mode === "create"}>
								<h2 class="text-base font-medium text-title">
									{T()("actions.create.document", {
										collectionSingle: props.state.collectionSingularName(),
									})}
								</h2>
							</Show>
							<Show when={props.mode !== "create" && !showViewSelector()}>
								<h2 class="text-base font-medium text-title">
									{props.state.collectionName()}
								</h2>
							</Show>
							<Show when={showViewSelector()}>
								<ViewSelector
									options={viewOptions}
									collectionSingularName={props.state.collectionSingularName}
									isDocumentMutated={props.state.isDocumentMutated}
									currentViewLabel={props.currentViewLabel}
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
										props.state.collection()?.localized && hasMultipleLocales()
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
										(props.state.collection()?.localized !== true ||
											!hasMultipleLocales()) &&
										displayLocale()
									}
								>
									<div class="flex items-center">
										<FaSolidLanguage size={16} />
										<span class="ml-2.5 text-base font-medium text-body">
											{displayLocale()?.name} ({displayLocale()?.code})
										</span>
									</div>
								</Show>
							</div>
						</Show>
						<div class="flex items-center gap-2.5 w-auto ml-auto">
							<Show when={props.state.showPreview?.()}>
								<Button
									type="button"
									theme="secondary-toggle"
									size="icon"
									active={props.state.previewOpen?.()}
									title={T()("common.preview")}
									aria-label={T()("common.preview")}
									aria-pressed={props.state.previewOpen?.()}
									classes={
										props.state.previewOpen?.()
											? "border-secondary-base! bg-secondary-base! text-secondary-contrast! fill-secondary-contrast! hover:bg-secondary-hover!"
											: undefined
									}
									onClick={() => props.actions.togglePreview?.()}
								>
									<Show
										when={props.state.previewOpen?.()}
										fallback={<FaSolidEye />}
									>
										<FaSolidEyeSlash />
									</Show>
								</Button>
							</Show>
							<Show when={props.state.ui.showUpsertButton?.()}>
								<ReleaseTrigger
									options={releaseOptions}
									onSelect={async (option) => {
										props.state.autoSave?.debouncedAutoSave.clear();
										props.state.ui.setReleaseEnvironmentTarget(option.value);
										props.state.ui.setReleaseEnvironmentAction(
											option.action ?? "publish",
										);
										props.state.ui.setReleaseEnvironmentOpen(true);
									}}
									onSave={() => {
										props.state.autoSave?.debouncedAutoSave.clear();
										props.actions?.upsertDocumentAction?.();
									}}
									saveDisabled={props.state.ui.saveDisabled?.()}
									savePermission={props.state.ui.hasSavePermission?.()}
									loading={
										props.state.ui.isSaving?.() ||
										props.state.ui.isAutoSaving?.() ||
										props.state.ui.isCreatingPublishOperation?.()
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
									{T()("documents.revisions.restore.action")}
								</Button>
							</Show>
							<Show
								when={props.state.ui.showDeleteButton?.() || showCopyPreview()}
							>
								<DocumentActions
									onDelete={
										props.state.ui.showDeleteButton?.()
											? () => props.state.ui?.setDeleteOpen?.(true)
											: undefined
									}
									deletePermission={props.state.ui.hasDeletePermission?.()}
									preview={
										showCopyPreview()
											? {
													onCopy: (mode) => void copyPreviewUrl(mode),
													permission: hasPreviewPermission(),
													loading: createPreview.action.isPending,
													scopedOnly: scopedPreviewOnly(),
												}
											: undefined
									}
								/>
							</Show>
						</div>
					</div>
				</Show>
			</div>
			<AutoSaveStatusPill
				ui={props.state.ui}
				autoSave={props.state.autoSave}
				draftCheckEnabled={() =>
					props.mode === "edit" &&
					props.state.ui.hasSavePermission?.() === true &&
					props.state.ui.isBuilderLocked?.() !== true &&
					props.state.ui.isAutoSaveActive?.() !== true
				}
			/>
		</>
	);
};
