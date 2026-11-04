import { Tooltip } from "@kobalte/core";
import { createHotkey, formatForDisplay } from "@tanstack/solid-hotkeys";
import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
	PreviewMode,
} from "@types";
import classNames from "classnames";
import {
	TbOutlineArrowBackUp,
	TbOutlineArrowForwardUp,
	TbOutlineEye,
	TbOutlineEyeOff,
	TbOutlineLanguage,
	TbOutlineLayoutColumns,
	TbOutlineListDetails,
	TbOutlineLock,
} from "solid-icons/tb";
import type { Accessor } from "solid-js";
import { type Component, createMemo, onCleanup, onMount, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import { Permissions } from "@/constants/permissions";
import type { UseBuilderEdits } from "@/hooks/useBuilderEdits/useBuilderEdits";
import type { UseDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import api from "@/services/api";
import siteStore from "@/store/siteStore/siteStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDocumentEnvironmentStatus } from "@/utils/document-environment-status";
import { formatRelationFilterValue } from "@/utils/document-filter-fields";
import helpers from "@/utils/helpers";
import { getLiveDocumentUrl } from "@/utils/live-document-url";
import { getDocumentProposals } from "@/utils/requests";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";
import { shortcuts } from "@/utils/shortcuts";
import spawnToast from "@/utils/spawn-toast";
import { AutoSaveStatusPill } from "./parts/AutoSaveStatusPill";
import { DocumentActions } from "./parts/DocumentActions";
import {
	PublishTrigger,
	type PublishTriggerAction,
	type PublishTriggerOption,
} from "./parts/PublishTrigger";
import { ViewSelector, type ViewSelectorOption } from "./parts/ViewSelector";

//* ghost buttons are already faint, so disabled ones fade further and ignore hover
const editButtonClass =
	"disabled:opacity-40! disabled:hover:bg-transparent disabled:hover:text-muted";
//* ghost while the bar wraps onto two rows, then outlined at the end of the one row
const actionsTriggerClass =
	"order-4 @3xl/builder-header:order-8 @3xl/builder-header:border @3xl/builder-header:border-border @3xl/builder-header:bg-input @3xl/builder-header:text-subtitle @3xl/builder-header:hover:bg-background-hover";
//* a toggle stays filled while its view or panel is open
const toggleButtonClass =
	"aria-pressed:bg-background-hover aria-pressed:text-title";

/** A header button that opens and closes a view beside the fields. */
type HeaderToggle = { open: Accessor<boolean>; toggle: () => void };

export const PageBuilderHeader: Component<{
	mode: "create" | "edit" | undefined;
	version?: Accessor<"latest" | string>;
	versionId?: Accessor<number | undefined>;
	/** Toggles the preview beside the fields. Left out where it isn't available. */
	preview?: HeaderToggle;
	/** Toggles the side-by-side view. Left out where it isn't available. */
	comparison?: HeaderToggle;
	/** Swaps the document's details in for the fields, where they don't fit beside them. */
	details?: HeaderToggle;
	/** The request that owns the proposal being edited. */
	requestLink?: string;
	currentViewLabel?: Accessor<string | undefined>;
	/** Undo and redo controls, omitted when the document cannot be edited. */
	edits?: UseBuilderEdits;
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
		isDocumentMutated?: Accessor<boolean>;
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseDocumentMutations["restoreRevisionAction"];
		beforeVersionChange?: (
			option: ViewSelectorOption,
		) => Promise<string | null>;
		/** Opens the align modal. Left out when the document has nothing to align with. */
		requestAlignment?: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let headerRef: HTMLElement | undefined;
	const documentLocalization = useDocumentLocalization();

	// -------------------------------
	// Queries & Mutations
	const createPreview = api.documents.useCreatePreview();
	const proposals = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				document: () => {
					const id = props.state.documentID();
					if (id === undefined) return undefined;
					return formatRelationFilterValue({
						collectionKey: props.state.collectionKey(),
						id,
					});
				},
			},
			perPage: 100,
		},
		enabled: () =>
			props.mode === "edit" &&
			props.state.documentID() !== undefined &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all,
	});

	// ----------------------------------
	// Memos
	const defaultLocale = createMemo(() => {
		return documentLocalization.locales().find((locale) => locale.isDefault);
	});
	const displayLocale = createMemo(() => {
		return defaultLocale() ?? documentLocalization.locales()[0];
	});
	const hasMultipleLocales = createMemo(() => {
		return documentLocalization.locales().length > 1;
	});
	const actionCollectionSingularName = createMemo(() =>
		helpers.getLocaleValue({
			value: props.state.collection()?.details.labels.singular,
		}),
	);
	const matchingAutoSaveMetadata = createMemo(() => {
		const document = props.state.document();
		const metadata = props.state.autoSaveMetadata?.();
		if (!document || !metadata) return null;
		if (metadata.id !== document.id) return null;
		if (metadata.versionId !== document.versionId) return null;

		return metadata;
	});
	const versionContentId = (versionType: string) => {
		const metadata = matchingAutoSaveMetadata();
		if (metadata?.versionType === versionType) return metadata.contentId;

		return props.state.document()?.versions[versionType]?.contentId;
	};
	const viewOptions = createMemo(() => {
		const options: ViewSelectorOption[] = [
			{
				label: T()("common.status.latest"),
				disabled: false,
				type: "latest",
				compareKey: "latest",
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

		for (const environment of props.state.collection()?.publishing
			.environments ?? []) {
			const status = getDocumentEnvironmentStatus({
				versions: props.state.document()?.versions,
				environmentKey: environment.key,
				latestContentId: versionContentId("latest"),
			});
			const isPublished = status !== "unpublished";

			options.push({
				label: helpers.getLocaleValue({ value: environment.label }),
				disabled: !isPublished,
				type: "environment",
				compareKey: environment.key,
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: environment.key,
				}),
				status: {
					isPublished: isPublished,
					upToDate: status === "in-sync",
				},
			});
		}

		for (const { request, document } of getDocumentProposals(
			proposals.data?.data ?? [],
			{
				collectionKey: props.state.collectionKey(),
				documentId: props.state.documentID(),
			},
		)) {
			options.push({
				label: request.title,
				type: "proposal",
				compareKey: `proposal:${request.id}`,
				disabled: false,
				location: getRequestRoute({ requestId: request.id, content: document }),
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
						? `/admin/collections/${props.state.collectionKey()}/${props.state.documentID()}/history`
						: "#",
			});
		}

		return options;
	});
	const publishOptions = createMemo<PublishTriggerOption[]>(() => {
		const collection = props.state.collection();
		const document = props.state.document();
		if (
			props.currentViewLabel?.() !== undefined ||
			props.mode !== "edit" ||
			!collection ||
			!document ||
			collection.locked ||
			document.isDeleted
		) {
			return [];
		}

		const environments = collection.publishing.environments ?? [];
		const publishReview = collection.publishing.review;
		const workflow = collection.publishing.workflow;
		const workflowStage = workflow?.stages.find(
			(stage) => stage.key === document.workflow?.stage,
		);
		const environmentLabels = new Map(
			environments.map((environment) => [
				environment.key,
				helpers.getLocaleValue({ value: environment.label }) || environment.key,
			]),
		);

		const options: PublishTriggerOption[] = environments.map((environment) => {
			const label = environmentLabels.get(environment.key) || environment.key;

			const environmentStatus = getDocumentEnvironmentStatus({
				versions: document.versions,
				environmentKey: environment.key,
				latestContentId: versionContentId("latest"),
			});
			const isPromoted = environmentStatus === "in-sync";

			const reviewRequired =
				publishReview?.publish.includes(environment.key) === true;

			//* starting a request only needs edit access, approving and completing are checked later
			const canPublish = userStore.get.hasPermission([
				environment.permissions.publish,
			]).all;
			const canCompose = userStore.get.hasPermission([
				Permissions.RequestsRead,
				collection.permissions.update,
			]).all;

			//* only targets some stage lists are gated by the workflow
			const workflowAllowsTarget =
				!workflow?.stages.some((stage) =>
					stage.targets.includes(environment.key),
				) || workflowStage?.targets.includes(environment.key) === true;

			const latestContentId = versionContentId("latest");
			const unmetPublishRequirementLabels =
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
			//* anything stopping a direct publish sends the document to a request instead, which
			//* can include the required targets and shows the workflow stage to move on
			const action: PublishTriggerOption["action"] =
				reviewRequired ||
				!canPublish ||
				!workflowAllowsTarget ||
				unmetPublishRequirementLabels.length > 0
					? "compose"
					: "publish";
			const permission = action === "compose" ? canCompose : canPublish;

			let disabledToast: PublishTriggerOption["disabledToast"];
			if (isPromoted) {
				disabledToast = {
					title: T()("toasts.publish.current.disabled.title"),
					message: T()("toasts.publish.current.disabled.message", {
						environment: label,
					}),
				};
			} else if (!permission) {
				disabledToast = {
					title: T()("toasts.publish.permission.disabled.title"),
					message: T()("toasts.publish.permission.disabled.message", {
						environment: label,
					}),
				};
			} else if (
				props.state.ui.isSaving?.() ||
				props.state.ui.isAutoSaving?.()
			) {
				disabledToast = {
					title: T()("toasts.publish.saving.disabled.title"),
					message: T()("toasts.publish.saving.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.ui.isPublishing?.()) {
				disabledToast = {
					title: T()("toasts.publish.publishing.disabled.title"),
					message: T()("toasts.publish.publishing.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.isDocumentMutated?.()) {
				disabledToast = {
					title: T()("toasts.publish.unsaved.disabled.title"),
					message: T()("toasts.publish.unsaved.disabled.message", {
						environment: label,
					}),
				};
			} else if (props.state.ui.canPublishDocument?.() === false) {
				disabledToast = {
					title: T()("toasts.publish.error.disabled.title"),
					message: T()("toasts.publish.error.disabled.message", {
						environment: label,
					}),
				};
			}

			return {
				label,
				value: environment.key,
				action,
				route: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: props.state.documentID(),
					version: environment.key,
				}),
				disabled: disabledToast !== undefined,
				...(disabledToast ? { disabledToast } : {}),
				status: {
					isPublished: environmentStatus !== "unpublished",
					upToDate: isPromoted,
				},
			};
		});

		return options;
	});
	const currentEnvironmentPublishOption = createMemo(() => {
		const version = props.version?.();
		if (!version || version === "latest") return undefined;

		const isEnvironment = props.state
			.collection()
			?.publishing.environments.some(
				(environment) => environment.key === version,
			);
		if (!isEnvironment) return undefined;

		return publishOptions().find((option) => option.value === version);
	});
	//* the create screen creates by default, or requests when creating isn't available
	const isBusy = createMemo(
		() =>
			props.state.ui.isSaving() ||
			props.state.ui.isAutoSaving() ||
			props.state.ui.isPublishing(),
	);
	const createDefault = createMemo(() =>
		props.mode === "create" ? props.state.ui.createActions()[0] : undefined,
	);
	const createAlternatives = createMemo((): PublishTriggerAction[] =>
		createDefault() === "create" &&
		props.state.ui.createActions().includes("request")
			? [
					{
						label: T()("documents.request.instead"),
						disabled: props.state.ui.isSaving(),
						onSelect: () => props.state.ui.setDocumentRequestOpen(true),
					},
				]
			: [],
	);
	const showViewSelector = createMemo(() => {
		const collection = props.state.collection();
		if (!collection) return false;
		//* a requested document only exists as its create request's proposal
		if (props.state.document()?.createRequestId) return false;

		const environments = collection.publishing.environments ?? [];

		return (
			props.mode !== "create" &&
			(props.currentViewLabel?.() !== undefined ||
				(proposals.data?.data.length ?? 0) > 0 ||
				collection.revisions.enabled ||
				environments.length > 0 ||
				(collection.publishing.review?.publish.length ?? 0) > 0)
		);
	});
	const showCopyPreview = createMemo(() => {
		const version = props.version?.() ?? "latest";
		const requiresVersionId =
			version === "revision" ||
			version === "snapshot" ||
			version === "proposal";

		return (
			props.mode === "edit" &&
			props.state.documentID() !== undefined &&
			(!requiresVersionId || props.versionId?.() !== undefined) &&
			props.state.document()?.isDeleted !== true &&
			props.state.collection()?.capabilities.preview === true
		);
	});
	const liveDocumentUrl = createMemo(() => {
		const collection = props.state.collection();
		const document = props.state.document();
		if (props.mode !== "edit" || !collection || !document) return null;

		return getLiveDocumentUrl({
			siteUrl: siteStore.get.siteUrl,
			environments: collection.publishing.environments,
			document,
			locale: documentLocalization.contentLocale() || null,
		});
	});
	const scopedPreviewOnly = createMemo(() => {
		const version = props.version?.() ?? "latest";
		return (
			version === "revision" || version === "snapshot" || version === "proposal"
		);
	});
	const hasPreviewPermission = createMemo(() => {
		const permission = props.state.collection()?.permissions.read;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).some;
	});
	const showAutoSave = createMemo(
		() =>
			props.mode === "edit" && props.state.ui.hasAutoSavePermission() === true,
	);
	const showActions = createMemo(
		() =>
			props.state.ui.showDeleteButton() ||
			props.state.ui.unpublishTarget() !== undefined ||
			props.state.ui.showDuplicateButton() ||
			props.state.ui.showExportButton() ||
			props.actions.requestAlignment !== undefined ||
			props.requestLink !== undefined ||
			showCopyPreview() ||
			showAutoSave() ||
			liveDocumentUrl() !== null,
	);
	//* locale and saving drop below the view when the header is narrow
	const hasSecondRow = createMemo(
		() =>
			props.mode !== undefined ||
			currentEnvironmentPublishOption() !== undefined ||
			props.state.ui.showUpsertButton() ||
			props.state.ui.showRestoreRevisionButton(),
	);

	// ----------------------------------
	// Functions
	const save = () => {
		if (createDefault() === "request") {
			props.state.ui.setDocumentRequestOpen(true);
			return;
		}
		props.state.autoSave?.debouncedAutoSave.clear();
		props.actions?.upsertDocumentAction?.();
	};
	//* mirrors the save button, which explains a missing permission and is disabled while there's nothing to save
	const saveFromShortcut = () => {
		if (!props.state.ui.hasSavePermission()) {
			spawnToast({
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
				status: "warning",
			});
			return;
		}
		if (props.state.ui.saveDisabled() || isBusy()) return;
		save();
	};
	const openPublishOption = (option: PublishTriggerOption) => {
		if (option.disabledToast) {
			spawnToast({
				...option.disabledToast,
				status: option.disabledToast.status ?? "warning",
			});
			return;
		}

		props.state.autoSave?.debouncedAutoSave.clear();
		props.state.ui.setPublishTarget(option.value);
		props.state.ui.setPublishAction(option.action ?? "publish");
		props.state.ui.setPublishOpen(true);
	};
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
				locale: documentLocalization.contentLocale() || undefined,
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
	createHotkey(shortcuts.save.hotkey, saveFromShortcut, () => ({
		enabled: props.state.ui.showUpsertButton(),
		//* the browser's save page dialog never helps here, even while saving can't run
		preventDefault: "always",
	}));
	createHotkey(
		shortcuts.togglePreview.hotkey,
		() => props.preview?.toggle(),
		() => ({ enabled: props.preview !== undefined }),
	);
	onMount(() => {
		if (!headerRef) return;
		const header = headerRef;

		//* the part of the screen the stuck header covers, as its first row scrolls away on small screens
		const updateHeight = () => {
			const top = Number.parseFloat(getComputedStyle(header).top) || 0;
			document.documentElement.style.setProperty(
				"--document-header-bar-height",
				`${header.offsetHeight + Math.min(top, 0)}px`,
			);
		};

		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(header);
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
			<header
				ref={headerRef}
				style={{ "view-transition-name": "document-builder-header" }}
				class={classNames(
					"@container/builder-header sticky top-0 z-30 w-full shrink-0 rounded-b-xl border-x border-b border-border bg-background md:-mt-4 max-md:mt-px max-md:rounded-t-xl max-md:border-t",
					{
						"max-md:-top-12": hasSecondRow(),
					},
				)}
			>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 md:px-6 @3xl/builder-header:h-14 @3xl/builder-header:flex-nowrap @3xl/builder-header:py-0">
					<div class="order-1 flex min-h-9 min-w-0 flex-1 items-center gap-2">
						<Show when={props.mode === "create"}>
							<h2 class="truncate text-base font-medium text-title">
								{T()("actions.create.document", {
									collectionSingle: props.state.collectionSingularName(),
								})}
							</h2>
						</Show>
						<Show when={props.mode !== "create" && !showViewSelector()}>
							<h2 class="truncate text-base font-medium text-title">
								{props.currentViewLabel?.() || props.state.collectionName()}
							</h2>
						</Show>
						<Show when={showViewSelector()}>
							<ViewSelector
								options={viewOptions}
								collectionSingularName={props.state.collectionSingularName}
								isDocumentMutated={props.state.isDocumentMutated}
								currentViewLabel={props.currentViewLabel}
								onBeforeVersionChange={props.actions.beforeVersionChange}
								comparing={() => props.comparison?.open() === true}
							/>
						</Show>
						<Show
							when={
								props.mode !== undefined && props.state.ui.isDocumentLocked()
							}
						>
							<span
								role="img"
								class="flex shrink-0 text-muted"
								title={T()("documents.locked.message")}
								aria-label={T()("documents.locked.message")}
							>
								<TbOutlineLock size={14} />
							</span>
						</Show>
					</div>
					<Show when={props.edits}>
						{(edits) => (
							<div class="order-2 flex shrink-0 items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									shape="square"
									title={`${T()("builder.undo")} (${formatForDisplay(shortcuts.undo.hotkey)})`}
									aria-label={T()("builder.undo")}
									disabled={!edits().canUndo()}
									class={editButtonClass}
									onClick={() => edits().undo()}
								>
									<TbOutlineArrowBackUp />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									shape="square"
									title={`${T()("builder.redo")} (${formatForDisplay(shortcuts.redo.hotkey)})`}
									aria-label={T()("builder.redo")}
									disabled={!edits().canRedo()}
									class={editButtonClass}
									onClick={() => edits().redo()}
								>
									<TbOutlineArrowForwardUp />
								</Button>
							</div>
						)}
					</Show>
					<Show when={props.preview || props.comparison || props.details}>
						<div class="order-3 flex shrink-0 items-center gap-1">
							<Show when={props.edits}>
								<span
									aria-hidden="true"
									class="mx-1.5 hidden h-5 w-px bg-border @3xl/builder-header:block"
								/>
							</Show>
							<Show when={props.preview}>
								{(preview) => (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										shape="square"
										title={`${T()("common.preview")} (${formatForDisplay(shortcuts.togglePreview.hotkey)})`}
										aria-label={T()("common.preview")}
										aria-pressed={preview().open()}
										class={toggleButtonClass}
										onClick={() => preview().toggle()}
									>
										<Show when={preview().open()} fallback={<TbOutlineEye />}>
											<TbOutlineEyeOff />
										</Show>
									</Button>
								)}
							</Show>
							<Show when={props.comparison}>
								{(comparison) => (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										shape="square"
										title={T()("documents.compare.action")}
										aria-label={T()("documents.compare.action")}
										aria-pressed={comparison().open()}
										class={toggleButtonClass}
										onClick={() => comparison().toggle()}
									>
										<TbOutlineLayoutColumns />
									</Button>
								)}
							</Show>
							<Show when={props.details}>
								{(details) => (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										shape="square"
										title={T()("builder.details.toggle")}
										aria-label={T()("builder.details.toggle")}
										aria-pressed={details().open()}
										class={toggleButtonClass}
										onClick={() => details().toggle()}
									>
										<TbOutlineListDetails />
									</Button>
								)}
							</Show>
						</div>
					</Show>
					<Show when={showActions()}>
						<DocumentActions
							variant="ghost"
							class={actionsTriggerClass}
							collectionSingularName={actionCollectionSingularName()}
							requestLink={props.requestLink}
							autoSave={
								showAutoSave()
									? {
											enabled: props.state.autoSaveUserEnabled?.() ?? true,
											onToggle: userPreferencesStore.toggleAutoSaveEnabled,
										}
									: undefined
							}
							liveUrl={liveDocumentUrl() ?? undefined}
							duplicate={
								props.state.ui.showDuplicateButton?.()
									? {
											onDuplicate: () => props.state.ui.setDuplicateOpen(true),
											permission: props.state.ui.hasDuplicatePermission(),
											disabled: props.state.ui.duplicateDisabled(),
										}
									: undefined
							}
							export={
								props.state.ui.showExportButton()
									? {
											onExport: () => props.state.ui.setExportOpen(true),
											permission: true,
										}
									: undefined
							}
							align={
								props.actions.requestAlignment
									? {
											onAlign: props.actions.requestAlignment,
											permission: props.state.ui.hasSavePermission(),
											disabled:
												props.state.ui.isSaving() ||
												props.state.ui.isAutoSaving() ||
												props.state.autoSave?.isDraftCheckPending() === true,
										}
									: undefined
							}
							onDelete={
								props.state.ui.showDeleteButton?.()
									? () => props.state.ui?.setDeleteOpen?.(true)
									: undefined
							}
							deletePermission={props.state.ui.hasDeletePermission?.()}
							unpublish={
								props.state.ui.unpublishTarget() !== undefined
									? {
											onUnpublish: () => props.state.ui.setUnpublishOpen(true),
											permission: props.state.ui.hasUnpublishPermission(),
										}
									: undefined
							}
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
					<Show when={hasSecondRow()}>
						<span
							aria-hidden="true"
							class="order-5 basis-full @3xl/builder-header:hidden"
						/>
					</Show>
					<Show when={props.mode !== undefined}>
						<Show
							when={
								Boolean(props.state.collection()?.localized) &&
								hasMultipleLocales()
							}
							fallback={
								<Show when={displayLocale()}>
									{(locale) => (
										<div class="order-6 flex flex-1 @3xl/builder-header:flex-none">
											<Tooltip.Root openDelay={300} placement="bottom">
												<Tooltip.Trigger
													as="span"
													tabIndex={0}
													aria-label={T()("builder.locale.label", {
														locale: `${locale().name} (${locale().code})`,
													})}
													class="flex size-9 items-center justify-center rounded-md text-muted outline-none focus-visible:ring-1 focus-visible:ring-primary"
												>
													<TbOutlineLanguage size={16} />
												</Tooltip.Trigger>
												<Tooltip.Portal>
													<Tooltip.Content class="z-60 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-title shadow-md animate-dropdown">
														{T()("builder.locale.label", {
															locale: `${locale().name} (${locale().code})`,
														})}
													</Tooltip.Content>
												</Tooltip.Portal>
											</Tooltip.Root>
										</div>
									)}
								</Show>
							}
						>
							<div class="order-6 min-w-0 flex-1 @3xl/builder-header:w-44 @3xl/builder-header:flex-none @5xl/builder-header:w-54">
								<ContentLocaleSelect
									locales={documentLocalization.locales()}
									invalid={props.state.ui.brickTranslationErrors?.()}
									showShortcut={true}
								/>
							</div>
						</Show>
					</Show>
					<div class="order-7 flex shrink-0 items-center gap-2">
						<Show when={currentEnvironmentPublishOption()}>
							{(option) => (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									aria-disabled={option().disabled === true}
									class={classNames({
										"cursor-not-allowed opacity-80": option().disabled === true,
									})}
									loading={props.state.ui.isPublishing?.()}
									onClick={() => openPublishOption(option())}
								>
									{T()("documents.publish.update.environment", {
										environment: option().label,
									})}
								</Button>
							)}
						</Show>
						<Show when={props.state.ui.showUpsertButton?.()}>
							<PublishTrigger
								options={publishOptions}
								onSelect={openPublishOption}
								actions={createAlternatives()}
								onSave={save}
								saveLabel={
									createDefault() === "request"
										? T()("documents.request.action")
										: createDefault() === "create"
											? T()("common.create")
											: undefined
								}
								saveDisabled={props.state.ui.saveDisabled?.()}
								savePermission={props.state.ui.hasSavePermission?.()}
								loading={isBusy()}
							/>
						</Show>
						<Show when={props.state.ui.showRestoreRevisionButton?.()}>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={() => {
									const versionId = props.versionId?.();
									if (!versionId) return;
									props.state.ui.setRestoreRevisionVersionId(versionId);
									props.state.ui.setRestoreRevisionOpen(true);
								}}
								permission={props.state.ui.restorePermission?.()}
							>
								{T()("documents.revisions.restore.action")}
							</Button>
						</Show>
					</div>
				</div>
			</header>
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
