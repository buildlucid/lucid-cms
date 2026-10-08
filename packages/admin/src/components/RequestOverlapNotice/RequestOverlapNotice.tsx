import { A } from "@solidjs/router";
import type { RequestSummary } from "@types";
import { TbOutlineInfoCircle } from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import T from "@/translations";
import { getRequestRoute } from "@/utils/route-helpers";

/**
 * A one-line note that the document is already in other open requests, with
 * a link to each so they can be checked before adding another.
 */
const RequestOverlapNotice: Component<{
	requests: RequestSummary[];
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<p class="flex items-start gap-2 border-t border-border pt-4 text-xs leading-4 text-body">
			<span class="flex h-4 shrink-0 items-center text-icon mt-0.5">
				<TbOutlineInfoCircle size={12} />
			</span>
			<span title={T()("requests.overlap.description")}>
				{T()("requests.overlap.title", { count: props.requests.length })}{" "}
				<For each={props.requests}>
					{(request, index) => (
						<>
							<A
								href={getRequestRoute({ requestId: request.id })}
								class="text-xs text-title underline-offset-2 hover:underline"
							>
								{request.title}
							</A>
							<Show when={index() < props.requests.length - 1}>, </Show>
						</>
					)}
				</For>
			</span>
		</p>
	);
};

export default RequestOverlapNotice;
