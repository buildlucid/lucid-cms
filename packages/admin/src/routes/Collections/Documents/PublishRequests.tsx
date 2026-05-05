import type {
	PublishOperation,
	PublishOperationStatus,
	PublishOperationUser,
} from "@types";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Select } from "@/components/Groups/Form";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill, { type PillProps } from "@/components/Partials/Pill";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

type Scope = "assigned" | "requested" | "all";
const publishRequestStatuses = [
	"pending",
	"approved",
	"rejected",
	"cancelled",
	"superseded",
] as const;

const formatUser = (user: PublishOperationUser) => {
	const username = user?.username ?? user?.email;
	if (!username) return "-";
	return helpers.formatUserName(
		{
			username,
			firstName: user?.firstName,
			lastName: user?.lastName,
		},
		"username",
	);
};

const isPublishOperationStatus = (
	value: string | number | undefined,
): value is PublishOperationStatus =>
	typeof value === "string" &&
	publishRequestStatuses.some((status) => status === value);

const statusTheme = (status: PublishOperationStatus): PillProps["theme"] => {
	switch (status) {
		case "pending":
			return "warning-opaque";
		case "approved":
			return "primary-opaque";
		case "rejected":
		case "cancelled":
			return "error-opaque";
		case "superseded":
			return "outline";
	}
};

const statusLabel = (status: PublishOperationStatus) => {
	switch (status) {
		case "pending":
			return T()("pending");
		case "approved":
			return T()("approved");
		case "rejected":
			return T()("rejected");
		case "cancelled":
			return T()("cancelled");
		case "superseded":
			return T()("superseded");
	}
};

const CollectionsDocumentsPublishRequestsRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const versionType = createMemo((): "latest" => "latest");
	const versionId = createMemo(() => undefined);
	const [scope, setScope] = createSignal<Scope>("all");
	const [status, setStatus] = createSignal<
		PublishOperationStatus | undefined
	>();
	const [target, setTarget] = createSignal<string | undefined>();

	const state = useDocumentState({
		mode: "edit",
		version: versionType,
		versionId,
	});
	const uiState = useDocumentUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
		documentQuery: state.documentQuery,
		document: state.document,
		mode: "history",
		version: versionType,
		versionId,
	});
	const requests = api.publishRequests.useGetMultiple({
		queryParams: {
			filters: {
				status,
				collectionKey: state.collectionKey,
				documentId: state.documentId,
				target,
				assignedToMe: () => (scope() === "assigned" ? "true" : undefined),
				requestedByMe: () => (scope() === "requested" ? "true" : undefined),
			},
			perPage: 50,
		},
		enabled: () =>
			state.collection()?.config.publishRequests?.enabled === true &&
			(state.collection()?.config.publishRequests.targets?.length ?? 0) > 0 &&
			state.documentId() !== undefined,
	});

	// ----------------------------------
	// Memos
	const publishRequestsEnabled = createMemo(
		() =>
			state.collection()?.config.publishRequests?.enabled === true &&
			(state.collection()?.config.publishRequests.targets?.length ?? 0) > 0,
	);
	const targetOptions = createMemo(() => {
		const collection = state.collection();
		const publishRequests = collection?.config.publishRequests;
		if (!collection || !publishRequests?.enabled) return [];

		const enabledTargets = publishRequests.targets ?? [];

		return collection.config.environments
			.filter((environment) => enabledTargets.includes(environment.key))
			.map((environment) => ({
				value: environment.key,
				label:
					helpers.getLocaleValue({ value: environment.name }) ||
					environment.key,
			}));
	});
	const statusOptions = createMemo(() => [
		{ value: "pending", label: T()("pending") },
		{ value: "approved", label: T()("approved") },
		{ value: "rejected", label: T()("rejected") },
		{ value: "cancelled", label: T()("cancelled") },
		{ value: "superseded", label: T()("superseded") },
	]);
	const rows = createMemo(() => requests.data?.data ?? []);

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={uiState.isLoading()}>
				<div class="-mt-4 relative bg-background-base rounded-b-xl border border-border h-36">
					<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
				</div>
				<div class="mt-2 bg-background-base rounded-t-xl border border-border grow overflow-hidden relative">
					<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
						<span class="h-62 w-full skeleton block mb-4" />
						<span class="h-full w-full skeleton block" />
					</div>
				</div>
			</Match>
			<Match when={uiState.isSuccess()}>
				<HeaderBar
					mode={undefined}
					version={versionType}
					versionId={versionId}
					state={{
						collection: state.collection,
						collectionKey: state.collectionKey,
						collectionName: state.collectionName,
						collectionSingularName: state.collectionSingularName,
						documentID: state.documentId,
						document: state.document,
						ui: uiState,
						showRevisionNavigation: () => true,
					}}
					actions={{}}
				/>
				<div class="mt-2 bg-background-base rounded-t-xl border border-border grow p-4 md:p-6">
					<div class="flex flex-col gap-4 min-w-0">
						<div class="flex flex-wrap gap-2">
							<Button
								type="button"
								theme="secondary-toggle"
								size="small"
								active={scope() === "assigned"}
								onClick={() => setScope("assigned")}
							>
								{T()("assigned_to_me")}
							</Button>
							<Button
								type="button"
								theme="secondary-toggle"
								size="small"
								active={scope() === "requested"}
								onClick={() => setScope("requested")}
							>
								{T()("created_by_me")}
							</Button>
							<Button
								type="button"
								theme="secondary-toggle"
								size="small"
								active={scope() === "all"}
								onClick={() => setScope("all")}
							>
								{T()("all")}
							</Button>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<Select
								id="document-publish-request-status"
								name="document-publish-request-status"
								value={status()}
								onChange={(value) =>
									setStatus(isPublishOperationStatus(value) ? value : undefined)
								}
								options={statusOptions()}
								copy={{ label: T()("status") }}
								noMargin={true}
							/>
							<Select
								id="document-publish-request-target"
								name="document-publish-request-target"
								value={target()}
								onChange={(value) =>
									setTarget(typeof value === "string" ? value : undefined)
								}
								options={targetOptions()}
								copy={{ label: T()("target") }}
								noMargin={true}
							/>
						</div>
						<Switch>
							<Match when={!publishRequestsEnabled()}>
								<div class="rounded-md border border-border bg-card-base p-6 text-center">
									<h2 class="text-base text-title font-medium">
										{T()("no_publish_requests")}
									</h2>
									<p class="text-sm text-body mt-1">
										{T()("publish_requests_not_enabled")}
									</p>
								</div>
							</Match>
							<Match when={requests.isLoading}>
								<div class="flex flex-col gap-2">
									<span class="skeleton h-18 rounded-md" />
									<span class="skeleton h-18 rounded-md" />
									<span class="skeleton h-18 rounded-md" />
								</div>
							</Match>
							<Match when={rows().length === 0}>
								<div class="rounded-md border border-border bg-card-base p-6 text-center">
									<h2 class="text-base text-title font-medium">
										{T()("no_publish_requests")}
									</h2>
									<p class="text-sm text-body mt-1">
										{T()("no_publish_requests_description")}
									</p>
								</div>
							</Match>
							<Match when={true}>
								<div class="flex flex-col border border-border rounded-md overflow-hidden">
									<For each={rows()}>
										{(request: PublishOperation) => (
											<div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 p-4 border-b border-border last:border-b-0 bg-card-base">
												<div class="min-w-0">
													<div class="flex flex-wrap items-center gap-2">
														<h2 class="text-sm font-semibold text-title">
															#{request.id}
														</h2>
														<Pill theme={statusTheme(request.status)}>
															{statusLabel(request.status)}
														</Pill>
														<Show when={request.isOutdated}>
															<Pill theme="warning-opaque">
																{T()("out_of_sync")}
															</Pill>
														</Show>
														<Show when={!request.permissions.review}>
															<Pill theme="outline">{T()("locked")}</Pill>
														</Show>
													</div>
													<p class="text-sm text-body mt-1">
														{T()("target")}: {request.target}
													</p>
												</div>
												<div class="flex flex-col lg:items-end gap-2 text-xs text-body">
													<span>
														{T()("requested_by")}:{" "}
														{formatUser(request.requestedBy)}
													</span>
													<span>
														{T()("requested_at")}:{" "}
														<DateText date={request.createdAt} />
													</span>
													<div class="flex flex-wrap gap-2">
														<Link
															href={`/lucid/collections/${request.collectionKey}/${request.documentId}/publish-requests/${request.id}`}
															theme="border-outline"
															size="small"
														>
															{T()("details")}
														</Link>
														<Link
															href={getDocumentRoute("edit", {
																collectionKey: request.collectionKey,
																documentId: request.documentId,
																status: "snapshot",
																versionId: request.snapshotVersionId,
															})}
															theme="primary"
															size="small"
														>
															{T()("view_snapshot")}
														</Link>
													</div>
												</div>
											</div>
										)}
									</For>
								</div>
							</Match>
						</Switch>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsPublishRequestsRoute;
