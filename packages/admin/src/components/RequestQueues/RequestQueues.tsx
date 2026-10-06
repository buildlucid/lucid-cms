import { A } from "@solidjs/router";
import type { RequestOverview } from "@types";
import classnames from "classnames";
import { type Component, For, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import {
	countRequestQueue,
	getRequestQueueRoute,
	requestQueues,
} from "@/utils/requests";

const RequestQueues: Component<{
	overview: RequestOverview | undefined;
	loading?: boolean;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class={classnames("@container", props.class)}>
			<ul class="grid grid-cols-2 gap-2 @lg:grid-cols-4">
				<For each={requestQueues}>
					{(queue) => (
						<li>
							<A
								href={getRequestQueueRoute(queue)}
								class="flex h-full flex-col gap-1 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							>
								<span class="flex items-center gap-2 text-xs text-muted">
									<StatusIndicator size="xs" variant={queue.indicator} />
									<span class="truncate">{queue.label()}</span>
								</span>
								<span class="text-2xl tabular-nums text-title">
									<Show when={!props.loading && props.overview} fallback="-">
										{(overview) => countRequestQueue(overview(), queue)}
									</Show>
								</span>
							</A>
						</li>
					)}
				</For>
			</ul>
		</div>
	);
};

export default RequestQueues;
