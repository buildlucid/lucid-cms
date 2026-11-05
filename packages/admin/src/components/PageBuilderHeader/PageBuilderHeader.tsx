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
	TbOutlineForms,
	TbOutlineLanguage,
	TbOutlineLayoutColumns,
	TbOutlineLock,
} from "solid-icons/tb";
import type { Accessor, JSX } from "solid-js";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	on,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import RevokePreviewLinksModal from "@/components/RevokePreviewLinksModal/RevokePreviewLinksModal";
import SegmentedControl, {
	type SegmentedControlOption,
} from "@/components/SegmentedControl/SegmentedControl";
import { Permissions } from "@/constants/permissions";
import type { UseBuilderEdits } from "@/hooks/useBuilderEdits/useBuilderEdits";
import type { UseDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import type { UseDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import type { UseDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import { useScrollProgress } from "@/hooks/useScrollProgress/useScrollProgress";
import api from "@/services/api";
import siteStore from "@/store/siteStore/siteStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
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

//* icon buttons are already faint, so disabled ones fade further and ignore hover
const editButtonClass =
	"disabled:opacity-40! disabled:hover:bg-transparent disabled:hover:text-icon";
//* the primary actions sit at 32px, between the 28px icon buttons and a 36px button
const actionButtonClass = "h-8!";
//* the editing header starts this much taller, for the line under the title, and condenses as the page scrolls it away
const CONDENSE_DISTANCE = 16;

/** What sits beside the page builder's fields. */
export type BuilderView = "fields" | "preview" | "compare";

export const PageBuilderHeader: Component<{
	mode: "create" | "edit" | undefined;
	version?: Accessor<"latest" | string>;
	versionId?: Accessor<number | undefined>;
	/** What sits beside the fields, picked with the header's view switch. Left out where neither the preview nor a comparison is available. */
	view?: {
		value: Accessor<BuilderView>;
		/** The views offered besides the fields alone. */
		options: Accessor<Exclude<BuilderView, "fields">[]>;
		onChange: (view: BuilderView) => void;
	};
	/** While previewing, the header is the top row of the preview's card, split where its columns split. */
	previewBar?: {
		fieldsWidth: Accessor<number>;
		/** Receives the element the preview renders its own controls into. */
		setToolbar: (element: HTMLDivElement) => void;
	};
	/** The request that owns the proposal being edited. */
	requestLink?: string;
	/** Runs once the document's preview links are revoked, which ends the builder's own preview too. */
	onPreviewLinksRevoked?: () => void;
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
	const [oneRow, setOneRow] = createSignal(false);
	const [revokeOpen, setRevokeOpen] = createSignal(false);
	const [now, setNow] = createSignal(Date.now());
	const condense = useScrollProgress(CONDENSE_DISTANCE);
	const shadow = useScrollProgress(120);

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
	const documentUpdatedAt = createMemo(
		() =>
			matchingAutoSaveMetadata()?.updatedAt ??
			props.state.document()?.updatedAt,
	);
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
	const hasRevokePermission = createMemo(() => {
		const permission = props.state.collection()?.permissions.update;
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
	//* the controls drop below the view when the header is narrow
	const hasSecondRow = createMemo(
		() =>
			props.mode !== undefined ||
			currentEnvironmentPublishOption() !== undefined ||
			props.state.ui.showUpsertButton() ||
			props.state.ui.showRestoreRevisionButton(),
	);
	//* the editing header condenses as it sticks; the preview's is the top of its card instead
	const condensing = createMemo(() => !props.previewBar && oneRow());
	const subtitle = createMemo(() => {
		const updatedAt = documentUpdatedAt();
		return updatedAt
			? T()("builder.header.subtitle", {
					collection: props.state.collectionName(),
					time: dateHelpers.formatRelativeDate(updatedAt, now()),
				})
			: props.state.collectionName();
	});
	const viewSwitchOptions = createMemo(
		(): SegmentedControlOption<BuilderView>[] => {
			const offered = props.view?.options() ?? [];
			return [
				{
					value: "fields",
					label: T()("builder.view.fields"),
					icon: <TbOutlineForms size={12} />,
				},
				...(offered.includes("preview")
					? [
							{
								value: "preview" as const,
								label: `${T()("common.preview")} (${formatForDisplay(shortcuts.togglePreview.hotkey)})`,
								icon: <TbOutlineEye size={12} />,
							},
						]
					: []),
				...(offered.includes("compare")
					? [
							{
								value: "compare" as const,
								label: T()("documents.compare.action"),
								icon: <TbOutlineLayoutColumns size={12} />,
							},
						]
					: []),
			];
		},
	);
	const headerStyle = createMemo((): JSX.CSSProperties | undefined =>
		condensing()
			? {
					"box-shadow": `0 10px 24px -18px rgb(0 0 0 / ${0.6 * shadow()})`,
				}
			: undefined,
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
		() =>
			props.view?.onChange(
				props.view.value() === "preview" ? "fields" : "preview",
			),
		() => ({ enabled: props.view?.options().includes("preview") === true }),
	);
	onMount(() => {
		if (!headerRef) return;
		const header = headerRef;

		//* Subtract header content that scrolls away from the sticky offset.
		const updateHeight = () => {
			const top = Number.parseFloat(getComputedStyle(header).top) || 0;
			document.documentElement.style.setProperty(
				"--document-header-bar-height",
				`${header.offsetHeight + Math.min(top, 0)}px`,
			);
		};
		const resizeObserver = new ResizeObserver(() => {
			setOneRow(header.clientWidth >= 768);
			updateHeight();
		});
		resizeObserver.observe(header);
		//* the offset changes with the layout rather than the size
		createEffect(on([condensing, hasSecondRow], updateHeight));
		//* keeps the subtitle's "updated" time current
		const clock = setInterval(() => setNow(Date.now()), 60_000);

		onCleanup(() => {
			resizeObserver.disconnect();
			clearInterval(clock);
			document.documentElement.style.removeProperty(
				"--document-header-bar-height",
			);
		});
	});

	// ----------------------------------
	// Render
	const title = (): JSXElement => (
		<div class="flex min-h-9 min-w-0 items-center gap-2">
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
					comparing={() => props.view?.value() === "compare"}
				/>
			</Show>
			<Show
				when={props.mode !== undefined && props.state.ui.isDocumentLocked()}
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
	);
	const edits = (): JSXElement => (
		<Show when={props.edits}>
			{(edits) => (
				<div class="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="toolbar"
						size="xs"
						shape="square"
						title={`${T()("builder.undo")} (${formatForDisplay(shortcuts.undo.hotkey)})`}
						aria-label={T()("builder.undo")}
						disabled={!edits().canUndo()}
						class={editButtonClass}
						onClick={() => edits().undo()}
					>
						<TbOutlineArrowBackUp size={12} />
					</Button>
					<Button
						type="button"
						variant="toolbar"
						size="xs"
						shape="square"
						title={`${T()("builder.redo")} (${formatForDisplay(shortcuts.redo.hotkey)})`}
						aria-label={T()("builder.redo")}
						disabled={!edits().canRedo()}
						class={editButtonClass}
						onClick={() => edits().redo()}
					>
						<TbOutlineArrowForwardUp size={12} />
					</Button>
				</div>
			)}
		</Show>
	);
	const divider = (): JSXElement => (
		<span aria-hidden="true" class="mx-1 h-4 w-px shrink-0 bg-border" />
	);
	const locale = (): JSXElement => (
		<Show when={props.mode !== undefined}>
			<Show
				when={
					Boolean(props.state.collection()?.localized) && hasMultipleLocales()
				}
				fallback={
					<Show when={displayLocale()}>
						{(locale) => (
							<Tooltip.Root openDelay={300} placement="bottom">
								<Tooltip.Trigger
									as="span"
									tabIndex={0}
									aria-label={T()("builder.locale.label", {
										locale: `${locale().name} (${locale().code})`,
									})}
									class="flex size-7 shrink-0 items-center justify-center rounded-md text-icon outline-none focus-visible:ring-1 focus-visible:ring-primary"
								>
									<TbOutlineLanguage size={12} />
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content class="z-60 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-title shadow-md animate-dropdown">
										{T()("builder.locale.label", {
											locale: `${locale().name} (${locale().code})`,
										})}
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						)}
					</Show>
				}
			>
				<ContentLocaleSelect
					compact
					locales={documentLocalization.locales()}
					invalid={props.state.ui.brickTranslationErrors?.()}
					errorLocales={props.state.ui.errorLocales?.()}
					showShortcut={true}
				/>
			</Show>
		</Show>
	);
	const viewSwitch = (): JSXElement => (
		<Show when={props.view}>
			{(view) => (
				<SegmentedControl
					label={T()("builder.view.label")}
					value={view().value()}
					options={viewSwitchOptions()}
					onChange={(next) => view().onChange(next)}
				/>
			)}
		</Show>
	);
	const actions = (): JSXElement => (
		<Show when={showActions()}>
			<DocumentActions
				variant="toolbar"
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
								onRevoke: () => setRevokeOpen(true),
								permission: hasPreviewPermission(),
								revokePermission: hasRevokePermission(),
								loading: createPreview.action.isPending,
								scopedOnly: scopedPreviewOnly(),
							}
						: undefined
				}
			/>
		</Show>
	);
	const primaryActions = (): JSXElement => (
		<div class="flex shrink-0 items-center gap-2">
			<Show when={currentEnvironmentPublishOption()}>
				{(option) => (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						aria-disabled={option().disabled === true}
						class={classNames(actionButtonClass, {
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
					class={actionButtonClass}
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
	);

	return (
		<>
			<header
				ref={headerRef}
				style={{
					"view-transition-name": "document-builder-header",
					...headerStyle(),
				}}
				class={classNames(
					"@container/builder-header sticky z-30 w-full shrink-0 border-x border-b border-border bg-background md:-mt-4 max-md:mt-px max-md:rounded-t-xl max-md:border-t",
					{
						"rounded-b-xl": !props.previewBar,
						"top-0": !condensing(),
						"-top-4": condensing(),
						"max-md:-top-12": hasSecondRow(),
					},
				)}
			>
				<div
					class={
						props.previewBar
							? "flex h-13"
							: "flex flex-wrap items-center gap-x-1 gap-y-1.5 px-4 py-3 md:px-6 @3xl/builder-header:h-17 @3xl/builder-header:flex-nowrap @3xl/builder-header:py-0"
					}
					style={
						condensing()
							? { transform: `translateY(${condense() * 8}px)` }
							: undefined
					}
				>
					<div
						class={
							props.previewBar
								? "flex shrink-0 items-center gap-1 border-e border-border ps-4 pe-2 md:ps-6"
								: "contents"
						}
						style={
							props.previewBar
								? { width: `${props.previewBar.fieldsWidth() + 1}px` }
								: undefined
						}
					>
						<div
							class={
								props.previewBar
									? "flex min-w-0 flex-1 items-center"
									: "flex min-w-0 basis-full flex-col justify-center @3xl/builder-header:flex-1 @3xl/builder-header:basis-auto"
							}
							//* Offset the title block to keep it centred as the subtitle collapses.
							style={
								condensing()
									? { "margin-top": `${-6 * (1 - condense())}px` }
									: undefined
							}
						>
							{title()}
							<Show when={condensing()}>
								{/* tucked up under the title, then gone as it condenses, so the title ends up centred */}
								<p
									class="truncate text-xs text-muted"
									style={{
										opacity: 1 - condense(),
										"max-height": `${18 * (1 - condense())}px`,
										"margin-top": `${-6 * (1 - condense())}px`,
									}}
								>
									{subtitle()}
								</p>
							</Show>
						</div>
						{edits()}
						<Show when={props.edits}>{divider()}</Show>
						{locale()}
					</div>
					<div
						class={
							props.previewBar
								? "@container/preview-bar flex min-w-0 flex-1 items-center gap-1 ps-2 pe-3 md:pe-4"
								: "contents"
						}
					>
						<Show when={props.previewBar}>
							{(bar) => (
								<div
									ref={bar().setToolbar}
									class="scrollbar-none -my-1 flex min-w-0 items-center overflow-x-auto py-1"
								/>
							)}
						</Show>
						<div
							class={
								props.previewBar
									? "ms-auto flex shrink-0 items-center gap-1"
									: "contents"
							}
						>
							<Show when={!props.previewBar && props.view}>{divider()}</Show>
							{viewSwitch()}
							{actions()}
							<div
								class={
									props.previewBar
										? "ps-1"
										: "ms-auto ps-1 @3xl/builder-header:ms-0"
								}
							>
								{primaryActions()}
							</div>
						</div>
					</div>
				</div>
			</header>
			<RevokePreviewLinksModal
				collectionKey={props.state.collectionKey()}
				documentId={props.state.documentID()}
				open={revokeOpen()}
				onOpenChange={setRevokeOpen}
				onRevoked={props.onPreviewLinksRevoked}
			/>
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
