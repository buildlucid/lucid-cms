import classnames from "classnames";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import DocumentThumb from "@/components/DocumentThumb/DocumentThumb";
import HomeCard from "@/components/HomeCard/HomeCard";
import HomeCardItem from "@/components/HomeCardItem/HomeCardItem";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import RequestQueues from "@/components/RequestQueues/RequestQueues";
import SkeletonListItems from "@/components/SkeletonListItems/SkeletonListItems";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getRequestState, requestStates, requestTypes } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

/**
 * The open request queues, then the open requests the user reviews or made,
 * so they can see what needs them and follow their own. The list is left out
 * when there are none.
 */
const ReviewWidget: Component<{ size: HomeWidgetSize }> = () => {
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
	// Memos
	const showRequests = createMemo(
		() =>
			requests.isLoading ||
			requests.isError ||
			(requests.data?.data.length ?? 0) > 0,
	);

	// ----------------------------------------
	// Render
	return (
		<HomeCard title={T()("home.widget.review.label")} href="/lucid/review">
			<RequestQueues
				overview={overview.data?.data}
				loading={overview.isLoading}
				//* list rows bring their own spacing, so the queues match the side inset on their own
				class={classnames("px-2 pt-1", { "pb-2": !showRequests() })}
			/>
			<Show when={showRequests()}>
				<h3 class="mt-4 mb-1 px-2 text-xs text-muted">
					{T()("home.widget.review.mine")}
				</h3>
				<Switch
					fallback={
						<ul class="flex flex-col">
							<For each={requests.data?.data}>
								{(request) => (
									<li>
										<HomeCardItem
											href={getRequestRoute({ requestId: request.id })}
											title={request.title}
											description={requestTypes[request.type].label()}
											thumb={
												<span class="relative flex">
													<DocumentThumb
														requested={request.type === "create"}
													/>
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
						</ul>
					}
				>
					<Match when={requests.isLoading}>
						<ul class="flex flex-col">
							<SkeletonListItems />
						</ul>
					</Match>
					<Match when={requests.isError}>
						<p class="flex min-h-9 items-center px-2 text-sm text-muted">
							{T()("home.widget.review.error")}
						</p>
					</Match>
				</Switch>
			</Show>
		</HomeCard>
	);
};

export default ReviewWidget;
