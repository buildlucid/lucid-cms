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
	TbOutlineCalendarPlus,
	TbOutlineClock,
	TbOutlineExternalLink,
	TbOutlineEye,
	TbOutlineEyeOff,
	TbOutlineLanguage,
	TbOutlineLayoutColumns,
	TbOutlineRotateClockwise2,
} from "solid-icons/tb";
import type { Accessor } from "solid-js";
import { type Component, createMemo, onCleanup, onMount, Show } from "solid-js";
import { Breadcrumbs as LayoutBreadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import Button from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import DateText from "@/components/DateText/DateText";
import { Permissions } from "@/constants/permissions";
import type { UseBuilderEdits } from "@/hooks/useBuilderEdits/useBuilderEdits";
import type { UseDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import { shortcutText } from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
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

type HeaderBreadcrumb = {
	link?: string;
	label: string;
	include?: boolean;
};

export const PageBuilderHeader: Component<{
	mode: "create" | "edit" | undefined;
	version?: Accessor<"latest" | string>;
	versionId?: Accessor<number | undefined>;
	trailingBreadcrumbs?: Accessor<Array<HeaderBreadcrumb> | undefined>;
	/** Toggles the side-by-side view. Left out where it isn't available. */
	comparison?: { open: Accessor<boolean>; toggle: () => void };
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
		showPreview?: UseDocumentUIState["showPreview"];
		previewOpen?: UseDocumentUIState["getPreviewOpen"];
		isDocumentMutated?: Accessor<boolean>;
	};
	actions: {
		upsertDocumentAction?: UseDocumentMutations["upsertDocumentAction"];
		publishDocumentAction?: UseDocumentMutations["publishDocumentAction"];
		restoreRevisionAction?: UseDocumentMutations["restoreRevisionAction"];
		togglePreview?: () => void;
		beforeVersionChange?: (
			option: ViewSelectorOption,
		) => Promise<string | null>;
		/** Opens the align modal. Left out when the document has nothing to align with. */
		requestAlignment?: () => void;
	};
}> = (props) => {
	// ----------------------------------
	// State / Hooks
	let stickyBarRef: HTMLDivElement | undefined;
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
	const collectionSummary = createMemo(() => {
		const fallback = T()("builder.header.summary.fallback", {
			collectionSingle: props.state.collectionSingularName(),
		});
		const summary = helpers.getLocaleValue({
			value: props.state.collection()?.details.description,
			fallback,
		});

		return summary.trim() || fallback;
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
				link: "/admin",
				label: T()("common.home"),
			},
			{
				link: `/admin/collections/${props.state.collectionKey()}`,
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

	// ----------------------------------
	// Functions
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
			<div class="w-full -mt-4 px-4 md:px-6 pt-4 mt:pt-6 bg-background border-x max-md:border-t border-border max-md:rounded-t-xl max-md:mt-px">
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
							<div class="hidden content-lg:flex items-center gap-x-3 gap-y-1.5 flex-wrap">
								<div class="flex items-center gap-1.5 text-body">
									<TbOutlineCalendarPlus size={12} />
									<DateText date={props.state.document()?.createdAt} />
								</div>
								<div class="flex items-center gap-1.5 text-body">
									<TbOutlineClock size={12} />
									<DateText date={documentUpdatedAt()} />
								</div>
							</div>
							<Show when={props.state.ui.hasAutoSavePermission?.()}>
								<button
									type="button"
									onClick={userPreferencesStore.toggleAutoSaveEnabled}
									class={classNames(
										"flex items-center justify-center w-6 h-6 rounded transition-colors",
										{
											"text-primary hover:text-primary-hover":
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
									<TbOutlineRotateClockwise2 size={12} />
								</button>
							</Show>
							<Show when={props.comparison}>
								{(comparison) => (
									<button
										type="button"
										onClick={() => comparison().toggle()}
										aria-pressed={comparison().open()}
										class={classNames(
											"flex items-center justify-center w-6 h-6 rounded transition-colors",
											{
												"text-primary hover:text-primary-hover":
													comparison().open(),
												"text-body/40 hover:text-body": !comparison().open(),
											},
										)}
										title={T()("documents.compare.action")}
										aria-label={T()("documents.compare.action")}
									>
										<TbOutlineLayoutColumns size={12} />
									</button>
								)}
							</Show>
						</div>
					</Show>
				</div>
			</div>
			<div
				ref={stickyBarRef}
				style={{ "view-transition-name": "document-builder-header" }}
				class="sticky top-0 z-30 w-full px-4 md:px-6 py-4 md:py-6 bg-background border-x border-b border-border rounded-b-xl flex flex-col content-lg:flex-row content-lg:items-center content-lg:justify-between gap-3 content-lg:gap-2.5"
			>
				<div class="flex min-w-0 items-center gap-2.5 w-full content-lg:w-auto">
					<div class="flex min-w-0 flex-col gap-1">
						<div class="flex min-w-0 flex-wrap items-center gap-2">
							<Show when={props.mode === "create"}>
								<h2 class="text-base font-medium text-title">
									{T()("actions.create.document", {
										collectionSingle: props.state.collectionSingularName(),
									})}
								</h2>
							</Show>
							<Show when={props.mode !== "create" && !showViewSelector()}>
								<h2 class="text-base font-medium text-title">
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
						</div>
						<p class="text-sm text-body">{collectionSummary()}</p>
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
					{/* the title wraps rather than this row shrinking, which would push the locale select under the save button */}
					<div class="flex md:flex-wrap md:items-center gap-2.5 justify-end w-full content-lg:w-auto content-lg:shrink-0">
						<Show when={props.mode !== undefined}>
							<div class="flex items-center gap-2.5 w-full md:flex-1 md:min-w-0">
								<Show when={props.edits}>
									{(edits) => (
										<div class="flex items-center gap-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												shape="square"
												title={`${T()("builder.undo")} (${shortcutText.undo})`}
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
												title={`${T()("builder.redo")} (${shortcutText.redo})`}
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
								<Show
									when={
										Boolean(props.state.collection()?.localized) &&
										hasMultipleLocales()
									}
								>
									<div class="flex-1 min-w-0 content-lg:flex-none content-lg:w-54">
										<ContentLocaleSelect
											locales={documentLocalization.locales()}
											invalid={props.state.ui.brickTranslationErrors?.()}
											showShortcut={true}
										/>
									</div>
								</Show>
								<Show
									when={
										(!props.state.collection()?.localized ||
											!hasMultipleLocales()) &&
										displayLocale()
									}
								>
									<div class="flex items-center">
										<TbOutlineLanguage size={16} />
										<span class="ml-2.5 text-base font-medium text-body">
											{displayLocale()?.name} ({displayLocale()?.code})
										</span>
									</div>
								</Show>
							</div>
						</Show>
						<div class="flex items-center gap-2.5 w-auto ml-auto">
							<Show when={currentEnvironmentPublishOption()}>
								{(option) => (
									<Button
										type="button"
										variant="secondary"
										size="sm"
										aria-disabled={option().disabled === true}
										class={classNames({
											"cursor-not-allowed opacity-80":
												option().disabled === true,
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
							<Show when={liveDocumentUrl()}>
								{(url) => (
									<a
										href={url()}
										target="_blank"
										rel="noreferrer"
										class={getButtonClasses({
											variant: "outline",
											size: "sm",
											shape: "square",
										})}
										title={T()("documents.live.view")}
										aria-label={T()("documents.live.view")}
									>
										<TbOutlineExternalLink />
									</a>
								)}
							</Show>
							<Show when={props.state.showPreview?.()}>
								<Button
									type="button"
									variant={props.state.previewOpen?.() ? "primary" : "outline"}
									size="sm"
									shape="square"
									title={T()("common.preview")}
									aria-label={T()("common.preview")}
									aria-pressed={props.state.previewOpen?.()}
									class={
										props.state.previewOpen?.()
											? "border-secondary! bg-secondary! text-secondary-foreground! hover:bg-secondary-hover!"
											: undefined
									}
									onClick={() => props.actions.togglePreview?.()}
								>
									<Show
										when={props.state.previewOpen?.()}
										fallback={<TbOutlineEye />}
									>
										<TbOutlineEyeOff />
									</Show>
								</Button>
							</Show>
							<Show when={props.state.ui.showUpsertButton?.()}>
								<PublishTrigger
									options={publishOptions}
									onSelect={openPublishOption}
									actions={createAlternatives()}
									onSave={() => {
										if (createDefault() === "request") {
											props.state.ui.setDocumentRequestOpen(true);
											return;
										}
										props.state.autoSave?.debouncedAutoSave.clear();
										props.actions?.upsertDocumentAction?.();
									}}
									saveLabel={
										createDefault() === "request"
											? T()("documents.request.action")
											: createDefault() === "create"
												? T()("common.create")
												: undefined
									}
									saveDisabled={props.state.ui.saveDisabled?.()}
									savePermission={props.state.ui.hasSavePermission?.()}
									loading={
										props.state.ui.isSaving?.() ||
										props.state.ui.isAutoSaving?.() ||
										props.state.ui.isPublishing?.()
									}
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
							<Show
								when={
									props.state.ui.showDeleteButton?.() ||
									props.state.ui.unpublishTarget() !== undefined ||
									props.state.ui.showDuplicateButton?.() ||
									props.actions.requestAlignment !== undefined ||
									props.requestLink !== undefined ||
									showCopyPreview()
								}
							>
								<DocumentActions
									collectionSingularName={actionCollectionSingularName()}
									requestLink={props.requestLink}
									duplicate={
										props.state.ui.showDuplicateButton?.()
											? {
													onDuplicate: () =>
														props.state.ui.setDuplicateOpen(true),
													permission: props.state.ui.hasDuplicatePermission(),
													disabled: props.state.ui.duplicateDisabled(),
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
														props.state.autoSave?.isDraftCheckPending() ===
															true,
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
													onUnpublish: () =>
														props.state.ui.setUnpublishOpen(true),
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
