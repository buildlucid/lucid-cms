import { type Component, For, Index, Show } from "solid-js";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import DashboardCardItem from "@/components/DashboardCardItem/DashboardCardItem";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import RequestQueues from "@/components/RequestQueues/RequestQueues";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getRequestState, requestStates } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

/**
 * The open request queues, then the open requests the user reviews or made,
 * so they can see what needs them and follow their own. The list is left out
 * when there are none.
 */
const ReviewWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const overview = api.requests.useGetOverview({ queryParams: {} });
	const requests = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				involvesMe: () => "1",
			},
			perPage: 5,
		},
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard title={T()("home.widget.review.label")} href="/lucid/review">
			<RequestQueues
				overview={overview.data?.data}
				loading={overview.isLoading}
				class="px-2 pt-1"
			/>
			<Show when={requests.isLoading || (requests.data?.data.length ?? 0) > 0}>
				<h3 class="mt-4 mb-1 px-2 text-xs text-muted">
					{T()("home.widget.review.mine")}
				</h3>
				<ul class="flex flex-col">
					<Show
						when={!requests.isLoading}
						fallback={
							<Index each={[1, 2, 3]}>
								{() => (
									<li class="flex items-center gap-3 px-2 py-2">
										<span class="skeleton block h-9 w-7 shrink-0" />
										<span class="flex grow flex-col gap-1.5">
											<span class="skeleton block h-3.5 w-1/2" />
											<span class="skeleton block h-3 w-1/3" />
										</span>
									</li>
								)}
							</Index>
						}
					>
						<For each={requests.data?.data}>
							{(request) => (
								<li>
									<DashboardCardItem
										href={getRequestRoute({ requestId: request.id })}
										title={request.title}
										description={T()(
											request.type === "create"
												? "requests.type.create"
												: "requests.type.publish",
										)}
										thumb={
											<span class="relative flex">
												<DocumentThumb requested={request.type === "create"} />
												<StatusIndicator
													variant={
														requestStates[getRequestState(request)].indicator
													}
													label={requestStates[
														getRequestState(request)
													].label()}
													class="absolute -right-1 -bottom-0.5 ring-2 ring-card"
												/>
											</span>
										}
										meta={dateHelpers.formatRelativeDate(request.updatedAt)}
									/>
								</li>
							)}
						</For>
					</Show>
				</ul>
			</Show>
		</DashboardCard>
	);
};

export default ReviewWidget;
