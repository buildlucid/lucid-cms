import { Collapsible } from "@kobalte/core";
import type {
	Collection,
	InternalCollectionDocument,
	Permission,
	RequestSummary,
	UserRef,
} from "@types";
import classNames from "classnames";
import {
	TbOutlineAlertTriangle,
	TbOutlineChevronRight,
	TbOutlineFileText,
	TbOutlineHistory,
	TbOutlineInfoCircle,
	TbOutlineSend,
	TbOutlineStack2,
	TbOutlineUser,
} from "solid-icons/tb";
import {
	type Accessor,
	type Component,
	createMemo,
	type JSXElement,
	lazy,
	Match,
	Show,
	Suspense,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import Copy from "@/components/Copy/Copy";
import DateText from "@/components/DateText/DateText";
import Link from "@/components/Link/Link";
import Pill, { type PillProps } from "@/components/Pill/Pill";
import RequestCompactList from "@/components/RequestCompactList/RequestCompactList";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import type {
	RetentionInfo,
	TimelineItem,
} from "@/hooks/useDocumentHistoryState/useDocumentHistoryState";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore, {
	type SectionPreferenceKey,
} from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

const JSONPreview = lazy(() => import("@/components/JSONPreview/JSONPreview"));

const getRetentionVariant = (
	state: RetentionInfo["state"],
): PillProps["variant"] => {
	switch (state) {
		case "protected":
			return "neutral";
		case "retained":
			return "outline";
		case "expiring":
			return "warning-subtle";
		case "expired":
			return "danger-subtle";
		case "unknown":
			return "neutral";
	}
};

const TimelineDetails: Component<{
	item: TimelineItem;
	revisionName: string;
	onRevisionNameChange: (value: string) => void;
	onRestore: () => void;
	restore: {
		loading: boolean;
		permission: Permission | undefined;
	};
	collection: Accessor<Collection | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	selectedVersionDocument: Accessor<InternalCollectionDocument | undefined>;
	selectedVersionDocumentLoading: Accessor<boolean>;
	createdByUser: Accessor<UserRef | undefined>;
	retention: Accessor<RetentionInfo>;
	requests: Accessor<RequestSummary[]>;
	requestsLoading: Accessor<boolean>;
}> = (props) => {
	const formatTargetName = (target: string) => {
		const environment = props
			.collection()
			?.publishing.targets.find((environment) => environment.key === target);

		return (
			helpers.getLocaleValue({
				value: environment?.label,
				fallback: target,
			}) || target
		);
	};
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
	const embeddedBrickCount = createMemo(
		() =>
			selectedDocument()?.bricks?.filter((brick) => brick.type === "embedded")
				.length ??
			props.item.bricks?.embedded?.length ??
			0,
	);
	const fieldCount = createMemo(() => selectedDocument()?.fields?.length ?? 0);
	const requests = createMemo(() => props.requests());
	// ----------------------------------
	// Render
	return (
		<aside class="mt-4 lg:mt-6 mx-4 md:mx-6 lg:mx-0 lg:mr-6 mb-6 md:mb-8 pb-6 lg:pb-8 space-y-4">
			<section class="rounded-md border border-border bg-card p-4 md:p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p class="text-xs font-medium uppercase text-body">{eyebrow()}</p>
						<h3 class="mt-1 truncate text-lg font-semibold text-title">
							{title()}
						</h3>
					</div>
					<Pill variant="outline" class="shrink-0">
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
					<Link variant="outline" size="sm" href={viewHref()} class="w-full">
						{props.item.type === "latest"
							? T()("common.edit")
							: T()("common.view")}
					</Link>
					<Show when={props.item.type === "revision"}>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							class="w-full"
							loading={props.restore.loading}
							disabled={props.document()?.isDeleted}
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
				icon={<TbOutlineInfoCircle size={14} />}
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
							label={T()("common.updated.at")}
							value={<DateText date={props.item.updatedAt} />}
							show={
								props.item.type === "latest" && props.item.updatedAt !== null
							}
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
										<Copy.Button
											label={contentId()}
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
				icon={<TbOutlineStack2 size={14} />}
				preferenceKey="history.inspector.contentSummary"
			>
				<Switch>
					<Match when={props.selectedVersionDocumentLoading()}>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<span class="h-16 rounded-md skeleton" />
							<span class="h-16 rounded-md skeleton" />
							<span class="h-16 rounded-md skeleton" />
							<span class="h-16 rounded-md skeleton" />
						</div>
					</Match>
					<Match when={true}>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
							<Metric
								label={T()("common.bricks")}
								value={builderBrickCount()}
							/>
							<Metric
								label={T()("builder.bricks.fixed")}
								value={fixedBrickCount()}
							/>
							<Metric
								label={T()("builder.bricks.embedded")}
								value={embeddedBrickCount()}
							/>
							<Metric label={T()("common.fields")} value={fieldCount()} />
						</div>
					</Match>
				</Switch>
			</InspectorSection>

			<Show when={props.item.type === "revision"}>
				<InspectorSection
					title={T()("documents.revisions.retention.title")}
					icon={<TbOutlineHistory size={14} />}
					preferenceKey="history.inspector.revisionRetention"
				>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<Pill variant={getRetentionVariant(props.retention().state)}>
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
					title={T()("documents.request.activity")}
					icon={<TbOutlineSend size={14} />}
					meta={requests().length}
					preferenceKey="history.inspector.requestActivity"
				>
					<Switch>
						<Match when={props.requestsLoading()}>
							<div class="grid gap-2">
								<span class="h-24 rounded-md skeleton" />
								<span class="h-24 rounded-md skeleton" />
							</div>
						</Match>
						<Match when={requests().length === 0}>
							<div class="rounded-md border border-border bg-input/50 p-3">
								<p class="text-sm text-body">
									{T()("empty.states.request.activity")}
								</p>
							</div>
						</Match>
						<Match when={true}>
							<RequestCompactList requests={requests()} />
						</Match>
					</Switch>
				</InspectorSection>
			</Show>

			<InspectorSection
				title={T()("common.document.payload")}
				icon={<TbOutlineFileText size={14} />}
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
									json={document() as unknown as Record<string, unknown>}
								/>
							</Suspense>
						)}
					</Match>
				</Switch>
			</InspectorSection>
		</aside>
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
			<section class="rounded-md border border-border bg-card p-4">
				<Collapsible.Trigger class="group flex w-full items-center justify-between gap-3 rounded-md text-left focus:outline-hidden focus-visible:ring-1 ring-primary">
					<div class="flex min-w-0 items-center gap-2 text-title">
						<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-input text-body">
							{props.icon}
						</span>
						<h4 class="truncate text-sm font-semibold">{props.title}</h4>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Show when={props.meta !== undefined}>
							<Pill variant="outline">{props.meta}</Pill>
						</Show>
						<TbOutlineChevronRight
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
	<div class="min-w-0 rounded-md border border-border bg-input/50 px-3 py-2">
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
			<span class="min-w-0 text-sm font-medium text-muted">{props.value}</span>
		</div>
	</Show>
);

const AuthorDisplay: Component<{
	user?: UserRef;
	fallbackId: number | null;
}> = (props) => (
	<Show
		when={props.user}
		fallback={
			<span class="inline-flex items-center gap-2">
				<TbOutlineUser size={12} />
				{props.fallbackId ? `#${props.fallbackId}` : "-"}
			</span>
		}
	>
		{(user) => (
			<UserDisplay
				user={user()}
				variant="horizontal"
				size="xs"
				nameFormat="name"
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
				<Pill variant="primary-subtle">{T()("common.current.version")}</Pill>
			</Match>
			<Match when={props.item.type === "revision"}>
				<Pill variant="info-subtle">{T()("common.saved.revision")}</Pill>
			</Match>
			<Match when={props.item.type === "snapshot"}>
				<Pill variant="info-subtle">{T()("common.snapshot")}</Pill>
			</Match>
			<Match when={props.item.type === "environment" && props.item.isReleased}>
				<Pill variant="secondary">{T()("common.status.released")}</Pill>
			</Match>
		</Switch>
		<Show when={props.item.type === "environment"}>
			<Show
				when={props.item.inSyncWithPromotedFrom}
				fallback={
					<Pill variant="warning-subtle">
						{T()("common.status.out.of.sync")}
					</Pill>
				}
			>
				<Pill variant="success-subtle">{T()("common.status.in.sync")}</Pill>
			</Show>
		</Show>
		<Show
			when={props.item.type === "environment" && props.item.promotedFromLatest}
		>
			<Pill variant="outline">{T()("common.from.latest")}</Pill>
		</Show>
		<Show
			when={
				props.item.type === "environment" &&
				!props.item.promotedFromLatest &&
				props.item.promotedFrom
			}
		>
			<Pill variant="warning-subtle">
				<TbOutlineAlertTriangle size={10} class="mr-1.5" />
				{T()("common.status.not.latest")}
			</Pill>
		</Show>
	</>
);

export default TimelineDetails;
