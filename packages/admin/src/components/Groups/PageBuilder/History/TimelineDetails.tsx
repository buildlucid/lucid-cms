import { Collapsible } from "@kobalte/core";
import type {
	Collection,
	InternalCollectionDocument,
	PublishOperation,
} from "@types";
import classNames from "classnames";
import {
	FaSolidChevronRight,
	FaSolidCircleInfo,
	FaSolidClockRotateLeft,
	FaSolidFileLines,
	FaSolidLayerGroup,
	FaSolidPaperPlane,
	FaSolidTriangleExclamation,
	FaSolidUser,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	For,
	type JSXElement,
	lazy,
	Match,
	Show,
	Suspense,
	Switch,
} from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import ReleaseScheduleFields from "@/components/Modals/Documents/ReleaseScheduleFields";
import Button from "@/components/Partials/Button";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill, { type PillProps } from "@/components/Partials/Pill";
import UserDisplay from "@/components/Partials/UserDisplay";
import type {
	RetentionInfo,
	TimelineItem,
} from "@/hooks/document/useHistoryState";
import useUserPreference from "@/hooks/useUserPreference";
import api from "@/services/api";
import userPreferencesStore, {
	type SectionPreferenceKey,
} from "@/store/user-preferences";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDefaultTimezone, getScheduledAt } from "@/utils/release-schedule";
import { getDocumentRoute } from "@/utils/route-helpers";
import PublishRequestRow from "../Sidebar/Partials/PublishRequestRow";

const JSONPreview = lazy(() => import("@/components/Partials/JSONPreview"));

const getRetentionTheme = (
	state: RetentionInfo["state"],
): PillProps["theme"] => {
	switch (state) {
		case "protected":
			return "grey";
		case "retained":
			return "outline";
		case "expiring":
			return "warning-opaque";
		case "expired":
			return "error-opaque";
		case "unknown":
			return "grey";
	}
};

type DocumentAuthor = NonNullable<InternalCollectionDocument["createdBy"]>;

const TimelineDetails: Component<{
	item: TimelineItem;
	revisionName: string;
	onRevisionNameChange: (value: string) => void;
	onRestore: () => void;
	restore: {
		loading: boolean;
		permission: boolean;
	};
	collection: Accessor<Collection | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	selectedVersionDocument: Accessor<InternalCollectionDocument | undefined>;
	selectedVersionDocumentLoading: Accessor<boolean>;
	createdByUser: Accessor<DocumentAuthor | undefined>;
	retention: Accessor<RetentionInfo>;
	releaseOperations: Accessor<PublishOperation[]>;
	releaseOperationsLoading: Accessor<boolean>;
}> = (props) => {
	// ----------------------------------
	// State
	const [selectedOperation, setSelectedOperation] =
		createSignal<PublishOperation>();
	const [scheduleDate, setScheduleDate] = createSignal("");
	const [scheduleTime, setScheduleTime] = createSignal("");
	const [scheduleTimezone, setScheduleTimezone] = createSignal(
		getDefaultTimezone(),
	);
	const [validationError, setValidationError] = createSignal<string>();

	// ----------------------------------
	// Functions
	const formatTargetName = (target: string) => {
		const environment = props
			.collection()
			?.environments.find((environment) => environment.key === target);

		return (
			helpers.getLocaleValue({
				value: environment?.name,
				fallback: target,
			}) || target
		);
	};
	const resetSchedule = () => {
		setScheduleDate("");
		setScheduleTime("");
		setScheduleTimezone(getDefaultTimezone());
	};

	// ----------------------------------
	// Mutations
	const reschedule = api.publishOperations.useReschedule({
		onSuccess: () => {
			setSelectedOperation(undefined);
			resetSchedule();
			setValidationError(undefined);
		},
	});

	// ----------------------------------
	// Memos
	const title = createMemo(() => {
		if (props.item.type === "latest") return T()("common.status.latest");
		if (props.item.type === "revision") {
			return `${T()("common.revision")} #${props.item.id}`;
		}
		if (props.item.type === "snapshot") {
			return `${T()("common.snapshot")} #${props.item.id}`;
		}

		return formatTargetName(props.item.version);
	});
	const eyebrow = createMemo(() => {
		if (props.item.type === "environment") return T()("common.environment");
		if (props.item.type === "latest") return T()("common.current.version");
		if (props.item.type === "snapshot") return T()("common.snapshot");
		return T()("common.saved.revision");
	});
	const viewHref = createMemo(() =>
		getDocumentRoute("edit", {
			collectionKey: props.collection()?.key ?? "",
			documentId: props.document()?.id,
			version: props.item.version,
			versionId: props.item.id,
		}),
	);
	const selectedDocument = createMemo(() => props.selectedVersionDocument());
	const builderBrickCount = createMemo(
		() =>
			selectedDocument()?.bricks?.filter((brick) => brick.type === "builder")
				.length ??
			props.item.bricks?.builder?.length ??
			0,
	);
	const fixedBrickCount = createMemo(
		() =>
			selectedDocument()?.bricks?.filter((brick) => brick.type === "fixed")
				.length ??
			props.item.bricks?.fixed?.length ??
			0,
	);
	const fieldCount = createMemo(() => selectedDocument()?.fields?.length ?? 0);
	const releaseOperations = createMemo(() => props.releaseOperations());
	const pendingReleaseCount = createMemo(
		() =>
			releaseOperations().filter((operation) => operation.status === "pending")
				.length,
	);
	const scheduledReleaseCount = createMemo(
		() =>
			releaseOperations().filter(
				(operation) => operation.executionStatus === "scheduled",
			).length,
	);
	const executingReleaseCount = createMemo(
		() =>
			releaseOperations().filter(
				(operation) => operation.executionStatus === "executing",
			).length,
	);
	const selectedOperationHasSchedule = createMemo(() =>
		Boolean(selectedOperation()?.scheduledAt),
	);
	const scheduleError = createMemo(
		() => validationError() || reschedule.errors()?.message,
	);

	// ----------------------------------
	// Handlers
	const openSchedule = (operation: PublishOperation) => {
		setSelectedOperation(operation);
		setValidationError(undefined);
		reschedule.reset();

		if (operation.scheduledAt) {
			const scheduledAt = new Date(operation.scheduledAt);
			setScheduleDate(scheduledAt.toISOString().slice(0, 10));
			setScheduleTime(scheduledAt.toISOString().slice(11, 16));
			setScheduleTimezone(operation.scheduledTimezone ?? getDefaultTimezone());
			return;
		}

		resetSchedule();
	};
	const saveSchedule = async () => {
		const operation = selectedOperation();
		if (!operation) return;

		const scheduledAt = getScheduledAt({
			date: scheduleDate(),
			time: scheduleTime(),
			timezone: scheduleTimezone(),
		});
		if (!scheduledAt) {
			setValidationError(T()("documents.release.schedule.validation.required"));
			return;
		}

		await reschedule.action.mutateAsync({
			id: operation.id,
			body: {
				scheduledAt,
				scheduledTimezone: scheduleTimezone(),
			},
		});
	};
	const removeSchedule = async () => {
		const operation = selectedOperation();
		if (!operation) return;

		await reschedule.action.mutateAsync({
			id: operation.id,
			body: {
				scheduledAt: null,
				scheduledTimezone: null,
			},
		});
	};

	// ----------------------------------
	// Render
	return (
		<>
			<aside class="mt-4 lg:mt-6 mx-4 md:mx-6 lg:mx-0 lg:mr-6 mb-6 md:mb-8 pb-6 lg:pb-8 space-y-4">
				<section class="rounded-md border border-border bg-card-base p-4 md:p-5">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-xs font-medium uppercase text-body">{eyebrow()}</p>
							<h3 class="mt-1 truncate text-lg font-semibold text-title">
								{title()}
							</h3>
						</div>
						<Pill theme="outline" class="shrink-0">
							#{props.item.id}
						</Pill>
					</div>

					<div class="mt-3 flex flex-wrap gap-2">
						<VersionStatusPills item={props.item} />
					</div>

					<div
						class={classNames("mt-4 grid gap-2", {
							"sm:grid-cols-2": props.item.type === "revision",
						})}
					>
						<Link
							theme="border-outline"
							size="small"
							href={viewHref()}
							classes="w-full"
						>
							{props.item.type === "latest"
								? T()("common.edit")
								: T()("common.view")}
						</Link>
						<Show when={props.item.type === "revision"}>
							<Button
								type="button"
								theme="secondary"
								size="small"
								classes="w-full"
								loading={props.restore.loading}
								permission={props.restore.permission}
								onClick={props.onRestore}
							>
								{T()("documents.revisions.restore.to.latest.action")}
							</Button>
						</Show>
					</div>
				</section>

				<InspectorSection
					title={T()("common.version.details")}
					icon={<FaSolidCircleInfo size={14} />}
					preferenceKey="history.inspector.versionDetails"
				>
					<div class="grid gap-3">
						<div class="grid gap-2 text-sm">
							<DetailRow
								label={T()("common.type")}
								value={<VersionType item={props.item} />}
							/>
							<DetailRow
								label={T()("common.created.at")}
								value={<DateText date={props.item.createdAt} />}
							/>
							<DetailRow
								label={T()("common.created.by")}
								value={
									<AuthorDisplay
										user={props.createdByUser()}
										fallbackId={props.item.createdBy}
									/>
								}
							/>
							<DetailRow
								label={T()("common.promoted.from")}
								value={`#${props.item.promotedFrom}`}
								show={props.item.promotedFrom !== null}
							/>
							<DetailRow
								label={T()("common.content.id")}
								value={
									<Show
										when={props.item.contentId}
										fallback={<span class="text-body">-</span>}
									>
										{(contentId) => (
											<ClickToCopy
												type="simple"
												text={contentId()}
												value={contentId()}
												class="text-xs"
											/>
										)}
									</Show>
								}
								stacked={true}
							/>
						</div>
					</div>
				</InspectorSection>

				<InspectorSection
					title={T()("common.content.summary")}
					icon={<FaSolidLayerGroup size={14} />}
					preferenceKey="history.inspector.contentSummary"
				>
					<Switch>
						<Match when={props.selectedVersionDocumentLoading()}>
							<div class="grid grid-cols-3 gap-2">
								<span class="h-16 rounded-md skeleton" />
								<span class="h-16 rounded-md skeleton" />
								<span class="h-16 rounded-md skeleton" />
							</div>
						</Match>
						<Match when={true}>
							<div class="grid grid-cols-3 gap-2">
								<Metric
									label={T()("common.bricks")}
									value={builderBrickCount()}
								/>
								<Metric
									label={T()("builder.bricks.fixed")}
									value={fixedBrickCount()}
								/>
								<Metric label={T()("common.fields")} value={fieldCount()} />
							</div>
						</Match>
					</Switch>
				</InspectorSection>

				<Show when={props.item.type === "revision"}>
					<InspectorSection
						title={T()("documents.revisions.retention.title")}
						icon={<FaSolidClockRotateLeft size={14} />}
						preferenceKey="history.inspector.revisionRetention"
					>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<Pill theme={getRetentionTheme(props.retention().state)}>
									{props.retention().label}
								</Pill>
								<Show when={props.retention().expiresAt}>
									{(expiresAt) => (
										<span class="text-xs text-body">
											{T()("documents.revisions.retention.cleanup.after")}{" "}
											<DateText date={expiresAt()} class="text-xs" />
										</span>
									)}
								</Show>
							</div>
							<p class="mt-2 text-sm text-body">
								{props.retention().description}
							</p>
						</div>
					</InspectorSection>
				</Show>

				<Show when={props.item.type === "environment"}>
					<InspectorSection
						title={T()("documents.release.activity")}
						icon={<FaSolidPaperPlane size={14} />}
						meta={releaseOperations().length}
						preferenceKey="history.inspector.releaseActivity"
					>
						<div class="mb-3 grid grid-cols-3 gap-2">
							<Metric
								label={T()("common.status.pending")}
								value={pendingReleaseCount()}
							/>
							<Metric
								label={T()("common.status.scheduled")}
								value={scheduledReleaseCount()}
							/>
							<Metric
								label={T()("common.status.executing")}
								value={executingReleaseCount()}
							/>
						</div>
						<Switch>
							<Match when={props.releaseOperationsLoading()}>
								<div class="grid gap-2">
									<span class="h-24 rounded-md skeleton" />
									<span class="h-24 rounded-md skeleton" />
								</div>
							</Match>
							<Match when={releaseOperations().length === 0}>
								<div class="rounded-md border border-border bg-input-base/50 p-3">
									<p class="text-sm text-body">
										{T()("empty.states.release.activity")}
									</p>
								</div>
							</Match>
							<Match when={true}>
								<div class="overflow-hidden rounded-md border border-border bg-card-base">
									<For each={releaseOperations()}>
										{(operation) => (
											<PublishRequestRow
												collection={props.collection}
												request={operation}
												onSchedule={openSchedule}
											/>
										)}
									</For>
								</div>
							</Match>
						</Switch>
					</InspectorSection>
				</Show>

				<InspectorSection
					title={T()("common.document.payload")}
					icon={<FaSolidFileLines size={14} />}
					preferenceKey="history.inspector.documentPayload"
				>
					<Switch>
						<Match when={props.selectedVersionDocumentLoading()}>
							<span class="block h-56 rounded-md skeleton" />
						</Match>
						<Match when={selectedDocument()}>
							{(document) => (
								<Suspense
									fallback={<span class="block h-56 rounded-md skeleton" />}
								>
									<JSONPreview
										title={T()("common.document.payload")}
										json={document() as unknown as Record<string, unknown>}
									/>
								</Suspense>
							)}
						</Match>
					</Switch>
				</InspectorSection>
			</aside>

			<Confirmation
				theme="primary"
				state={{
					open: selectedOperation() !== undefined,
					setOpen: (open) => {
						if (!open) setSelectedOperation(undefined);
					},
					isLoading: reschedule.action.isPending,
					isError: !!scheduleError(),
				}}
				copy={{
					title: selectedOperationHasSchedule()
						? T()("common.reschedule.release")
						: T()("documents.release.schedule.action"),
					description: T()("modals.common.schedule.release.description"),
					confirm: T()("actions.update.schedule"),
					error: scheduleError(),
				}}
				callbacks={{
					onConfirm: saveSchedule,
					onCancel: () => {
						setSelectedOperation(undefined);
						resetSchedule();
						setValidationError(undefined);
						reschedule.reset();
					},
				}}
				slots={{
					actions: (
						<>
							<Button
								theme="border-outline"
								size="medium"
								type="button"
								disabled={reschedule.action.isPending}
								onClick={() => {
									setSelectedOperation(undefined);
									resetSchedule();
									setValidationError(undefined);
									reschedule.reset();
								}}
							>
								{T()("common.cancel")}
							</Button>
							<Show when={selectedOperationHasSchedule()}>
								<Button
									theme="danger-outline"
									size="medium"
									type="button"
									loading={reschedule.action.isPending}
									onClick={removeSchedule}
								>
									{T()("documents.release.schedule.remove")}
								</Button>
							</Show>
							<Button
								theme="primary"
								size="medium"
								type="button"
								loading={reschedule.action.isPending}
								onClick={saveSchedule}
							>
								{selectedOperationHasSchedule()
									? T()("actions.update.schedule")
									: T()("documents.release.schedule.action")}
							</Button>
						</>
					),
				}}
			>
				<div class="grid gap-3 pb-4 md:pb-6">
					<ReleaseScheduleFields
						date={scheduleDate()}
						setDate={setScheduleDate}
						time={scheduleTime()}
						setTime={setScheduleTime}
						timezone={scheduleTimezone()}
						setTimezone={setScheduleTimezone}
						onChange={() => setValidationError(undefined)}
					/>
				</div>
			</Confirmation>
		</>
	);
};

const InspectorSection: Component<{
	title: string;
	icon: JSXElement;
	preferenceKey: SectionPreferenceKey;
	children: JSXElement;
	meta?: number;
}> = (props) => {
	// ----------------------------------
	// State
	const [open, setOpen] = useUserPreference({
		value: () => userPreferencesStore.getSectionOpen(props.preferenceKey),
		setValue: (value) =>
			userPreferencesStore.setSectionOpen(props.preferenceKey, value),
		defaultValue: true,
	});

	// ----------------------------------
	// Render
	return (
		<Collapsible.Root open={open()} onOpenChange={setOpen}>
			<section class="rounded-md border border-border bg-card-base p-4">
				<Collapsible.Trigger class="group flex w-full items-center justify-between gap-3 rounded-md text-left focus:outline-hidden focus-visible:ring-1 ring-primary-base">
					<div class="flex min-w-0 items-center gap-2 text-title">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-input-base text-body">
							{props.icon}
						</span>
						<h4 class="truncate text-sm font-semibold">{props.title}</h4>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Show when={props.meta !== undefined}>
							<Pill theme="outline">{props.meta}</Pill>
						</Show>
						<FaSolidChevronRight
							size={12}
							class={classNames(
								"shrink-0 text-body transition-transform duration-200",
								{
									"rotate-90": open(),
								},
							)}
						/>
					</div>
				</Collapsible.Trigger>
				<Collapsible.Content class="mt-3">{props.children}</Collapsible.Content>
			</section>
		</Collapsible.Root>
	);
};

const Metric: Component<{
	label: string;
	value: number;
}> = (props) => (
	<div class="min-w-0 rounded-md border border-border bg-input-base/50 px-3 py-2">
		<p class="text-base font-semibold text-title">{props.value}</p>
		<p class="mt-0.5 truncate text-xs text-body">{props.label}</p>
	</div>
);

const DetailRow: Component<{
	label: string;
	value: JSXElement;
	show?: boolean;
	stacked?: boolean;
}> = (props) => (
	<Show when={props.show !== false}>
		<div
			class={classNames(
				"flex gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0",
				{
					"flex-col items-start": props.stacked,
					"items-center justify-between": !props.stacked,
				},
			)}
		>
			<span class="text-sm font-medium text-subtitle">{props.label}</span>
			<span class="min-w-0 text-sm font-medium text-unfocused">
				{props.value}
			</span>
		</div>
	</Show>
);

const AuthorDisplay: Component<{
	user?: DocumentAuthor;
	fallbackId: number | null;
}> = (props) => (
	<Show
		when={props.user}
		fallback={
			<span class="inline-flex items-center gap-2">
				<FaSolidUser size={12} />
				{props.fallbackId ? `#${props.fallbackId}` : "-"}
			</span>
		}
	>
		{(user) => (
			<UserDisplay
				user={{
					username:
						user().username ?? user().email ?? T()("media.types.unknown"),
					firstName: user().firstName,
					lastName: user().lastName,
					profilePicture: user().profilePicture,
				}}
				mode="short"
				size="x-small"
				nameFormat="simple"
			/>
		)}
	</Show>
);

const VersionType: Component<{
	item: TimelineItem;
}> = (props) => (
	<Switch>
		<Match when={props.item.type === "latest"}>
			{T()("common.status.latest")}
		</Match>
		<Match when={props.item.type === "environment"}>
			{T()("common.environment")}
		</Match>
		<Match when={props.item.type === "revision"}>
			{T()("common.revision")}
		</Match>
		<Match when={props.item.type === "snapshot"}>
			{T()("common.snapshot")}
		</Match>
	</Switch>
);

const VersionStatusPills: Component<{
	item: TimelineItem;
}> = (props) => (
	<>
		<Switch>
			<Match when={props.item.type === "latest"}>
				<Pill theme="primary-opaque">{T()("common.current.version")}</Pill>
			</Match>
			<Match when={props.item.type === "revision"}>
				<Pill theme="info-opaque">{T()("common.saved.revision")}</Pill>
			</Match>
			<Match when={props.item.type === "snapshot"}>
				<Pill theme="info-opaque">{T()("common.snapshot")}</Pill>
			</Match>
			<Match when={props.item.type === "environment" && props.item.isReleased}>
				<Pill theme="secondary">{T()("common.status.released")}</Pill>
			</Match>
		</Switch>
		<Show when={props.item.type === "environment"}>
			<Show
				when={props.item.inSyncWithPromotedFrom}
				fallback={
					<Pill theme="warning-opaque">{T()("common.status.out.of.sync")}</Pill>
				}
			>
				<Pill theme="primary-opaque">{T()("common.status.in.sync")}</Pill>
			</Show>
		</Show>
		<Show
			when={props.item.type === "environment" && props.item.promotedFromLatest}
		>
			<Pill theme="outline">{T()("common.from.latest")}</Pill>
		</Show>
		<Show
			when={
				props.item.type === "environment" &&
				!props.item.promotedFromLatest &&
				props.item.promotedFrom
			}
		>
			<Pill theme="warning-opaque">
				<FaSolidTriangleExclamation size={10} class="mr-1.5" />
				{T()("common.status.not.latest")}
			</Pill>
		</Show>
	</>
);

export default TimelineDetails;
