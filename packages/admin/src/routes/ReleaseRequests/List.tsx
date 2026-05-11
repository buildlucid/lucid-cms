import type { PublishOperation } from "@types";
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
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	formatPublishOperationUser,
	getPublishOperationStatusLabel,
	getPublishOperationStatusTheme,
} from "@/utils/publish-operations";
import { getDocumentRoute } from "@/utils/route-helpers";

type Scope = "assigned" | "requested" | "all";

const ReleaseRequestsListRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const [scope, setScope] = createSignal<Scope>("all");
	const [collectionKey, setCollectionKey] = createSignal<string | undefined>();
	const [target, setTarget] = createSignal<string | undefined>();

	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	const requests = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "pending",
				operationType: () => "request",
				collectionKey,
				target,
				assignedToMe: () => (scope() === "assigned" ? "true" : undefined),
				requestedByMe: () => (scope() === "requested" ? "true" : undefined),
			},
			perPage: 50,
		},
	});

	// ----------------------------------
	// Memos
	const reviewCollectionKeys = createMemo(
		() =>
			new Set(
				(collections.data?.data ?? [])
					.filter(
						(collection) =>
							(collection.config.review?.requiredFor?.length ?? 0) > 0,
					)
					.map((collection) => collection.key),
			),
	);
	const collectionOptions = createMemo(() =>
		(collections.data?.data ?? [])
			.filter((collection) => reviewCollectionKeys().has(collection.key))
			.map((collection) => ({
				value: collection.key,
				label:
					helpers.getLocaleValue({ value: collection.details.name }) ||
					collection.key,
			})),
	);
	const targetOptions = createMemo(() => {
		const keys = new Set<string>();
		for (const collection of collections.data?.data ?? []) {
			if (collectionKey() && collection.key !== collectionKey()) continue;
			for (const target of collection.config.review?.requiredFor ?? [])
				keys.add(target);
		}
		return Array.from(keys).map((key) => ({
			value: key,
			label: key,
		}));
	});
	const rows = createMemo(() =>
		(requests.data?.data ?? []).filter((request) =>
			reviewCollectionKeys().has(request.collectionKey),
		),
	);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("publish_requests_route_title"),
							description: T()("publish_requests_route_description"),
						}}
					/>
				),
			}}
		>
			<div class="p-4 md:p-6 flex flex-col gap-4">
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
						id="publish-request-collection"
						name="publish-request-collection"
						value={collectionKey()}
						onChange={(value) =>
							setCollectionKey(typeof value === "string" ? value : undefined)
						}
						options={collectionOptions()}
						copy={{ label: T()("collection") }}
						noMargin={true}
					/>
					<Select
						id="publish-request-target"
						name="publish-request-target"
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
					<Match when={requests.isLoading || collections.isLoading}>
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
													{request.collectionKey} #{request.documentId}
												</h2>
												<Pill
													theme={getPublishOperationStatusTheme(request.status)}
												>
													{getPublishOperationStatusLabel(request.status)}
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
											<Show when={request.scheduledAt}>
												<p class="text-sm text-body mt-1">
													{T()("scheduled_for")}:{" "}
													<DateText date={request.scheduledAt} />
													<Show when={request.scheduledTimezone}>
														{" "}
														({request.scheduledTimezone})
													</Show>
												</p>
											</Show>
											<Show when={request.executedAt}>
												<p class="text-sm text-body mt-1">
													{T()("executed_at")}:{" "}
													<DateText date={request.executedAt} />
												</p>
											</Show>
											<Show when={request.failedAt}>
												<p class="text-sm text-body mt-1">
													{T()("failed_at")}:{" "}
													<DateText date={request.failedAt} />
												</p>
											</Show>
										</div>
										<div class="flex flex-col lg:items-end gap-2 text-xs text-body">
											<span>
												{T()("requested_by")}:{" "}
												{formatPublishOperationUser(request.requestedBy)}
											</span>
											<span>
												{T()("requested_at")}:{" "}
												<DateText date={request.createdAt} />
											</span>
											<div class="flex flex-wrap gap-2">
												<Link
													href={`/lucid/collections/${request.collectionKey}/${request.documentId}/release-requests/${request.id}`}
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
		</Wrapper>
	);
};

export default ReleaseRequestsListRoute;
