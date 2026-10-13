import { A } from "@solidjs/router";
import type { RequestSummary } from "@types";
import { TbOutlineInfoCircle } from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import T from "@/translations";
import { getRequestRoute } from "@/utils/route-helpers";

/** Links to other open requests containing this document. */
const RequestOverlapNotice: Component<{
	requests: RequestSummary[];
	/** Every open request with the document, which can be more than are listed. */
	total: number;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<p class="flex items-start gap-2 border-t border-border pt-4 text-xs leading-4 text-body">
			<span class="flex h-4 shrink-0 items-center text-icon mt-0.5">
				<TbOutlineInfoCircle size={12} />
			</span>
			<span title={T()("requests.overlap.description")}>
				{T()("requests.overlap.title", { count: props.total })}{" "}
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
