import { A } from "@solidjs/router";
import type { RequestSummary } from "@types";
import { TbOutlineExternalLink } from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import { getRequestState, requestStates } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

/**
 * A short list of requests for sidebars, shaped like the chat's document
 * references: a small request mark, the title, and its status below.
 */
const RequestCompactList: Component<{
	requests: RequestSummary[];
	loading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div>
			<Show when={props.loading}>
				<span class="block h-12 skeleton rounded-md" />
			</Show>
			<Show when={!props.loading && props.requests.length === 0}>
				<p class="text-xs text-muted">{T()("requests.document.none")}</p>
			</Show>
			<ul class="flex flex-col gap-0.5">
				<For each={props.requests}>
					{(request) => (
						<li>
							<A
								href={getRequestRoute({ requestId: request.id })}
								class="-mx-1.5 flex min-w-0 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							>
								<span
									aria-hidden="true"
									class="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-border bg-input text-muted"
								>
									<TbOutlineExternalLink size={10} />
								</span>
								<span class="flex min-w-0 grow flex-col">
									<span class="truncate text-xs text-title">
										{request.title}
									</span>
									<span class="flex items-center gap-1.5 truncate text-[11px] leading-4 text-muted">
										<StatusIndicator
											size="xs"
											variant={
												requestStates[getRequestState(request)].indicator
											}
										/>
										{requestStates[getRequestState(request)].label()}
										<span aria-hidden="true">·</span>
										{T()("requests.documents.count", {
											count: request.documents.length,
										})}
									</span>
								</span>
							</A>
						</li>
					)}
				</For>
			</ul>
		</div>
	);
};

export default RequestCompactList;
