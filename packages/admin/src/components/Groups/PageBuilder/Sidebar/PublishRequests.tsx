import type { Collection, PublishOperation } from "@types";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import { formatTargetName } from "./helpers";

export const PublishRequests: Component<{
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------
	// Queries
	const requests = api.publishRequests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "pending",
				collectionKey: props.collectionKey,
				documentId: props.documentId,
			},
			perPage: 5,
		},
		enabled: () =>
			(props.collection()?.config.publishing.review.targets?.length ?? 0) > 0 &&
			props.documentId() !== undefined,
	});

	// ----------------------------------
	// Memos
	const reviewEnabled = createMemo(
		() =>
			(props.collection()?.config.publishing.review.targets?.length ?? 0) > 0,
	);
	const rows = createMemo(() => requests.data?.data ?? []);

	// ----------------------------------
	// Render
	return (
		<Show when={reviewEnabled()}>
			<section class="mt-6 pt-5 border-t border-border">
				<div class="flex items-center justify-between gap-3 mb-3">
					<h3 class="text-sm font-semibold text-title">
						{T()("pending_publish_requests")}
					</h3>
				</div>
				<Switch>
					<Match when={requests.isLoading}>
						<div class="flex flex-col gap-2">
							<span class="skeleton h-24 rounded-md" />
							<span class="skeleton h-24 rounded-md" />
						</div>
					</Match>
					<Match when={rows().length === 0}>
						<div class="rounded-md border border-border bg-card-base p-3">
							<p class="text-sm text-body">
								{T()("no_pending_publish_requests")}
							</p>
						</div>
					</Match>
					<Match when={true}>
						<div class="flex flex-col gap-2">
							<For each={rows()}>
								{(request: PublishOperation) => (
									<div class="rounded-md border border-border bg-card-base p-3">
										<div class="flex flex-wrap items-center gap-2">
											<h4 class="text-sm font-semibold text-title">
												#{request.id}
											</h4>
											<Pill theme="warning-opaque">{T()("pending")}</Pill>
											<Show when={request.isOutdated}>
												<Pill theme="warning-opaque">{T()("out_of_sync")}</Pill>
											</Show>
											<Show when={!request.permissions.review}>
												<Pill theme="outline">{T()("locked")}</Pill>
											</Show>
										</div>
										<div class="mt-2 flex flex-col gap-1 text-xs text-body">
											<span>
												{T()("target")}:{" "}
												<span class="text-title">
													{formatTargetName({
														collection: props.collection(),
														target: request.target,
													})}
												</span>
											</span>
											<span>
												{T()("requested_by")}:{" "}
												<span class="text-title">
													{request.requestedBy
														? helpers.formatUserName(
																{
																	username:
																		request.requestedBy.username ??
																		request.requestedBy.email ??
																		T()("unknown"),
																	firstName: request.requestedBy.firstName,
																	lastName: request.requestedBy.lastName,
																},
																"username",
															)
														: "-"}
												</span>
											</span>
											<span>
												{T()("requested_at")}:{" "}
												<DateText date={request.createdAt} class="text-xs" />
											</span>
										</div>
										<div class="mt-3 flex flex-col gap-2">
											<Link
												href={`/lucid/collections/${request.collectionKey}/${request.documentId}/publish-requests/${request.id}`}
												theme="border-outline"
												size="small"
												classes="w-full"
											>
												{T()("open_request")}
											</Link>
											<Link
												href={getDocumentRoute("edit", {
													collectionKey: request.collectionKey,
													documentId: request.documentId,
													status: "snapshot",
													versionId: request.snapshotVersionId,
												})}
												theme="secondary"
												size="small"
												classes="w-full"
											>
												{T()("view_snapshot")}
											</Link>
										</div>
									</div>
								)}
							</For>
						</div>
					</Match>
				</Switch>
			</section>
		</Show>
	);
};
