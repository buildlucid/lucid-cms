import { A } from "@solidjs/router";
import type { ReleaseSummary } from "@types";
import { FaSolidCircleInfo } from "solid-icons/fa";
import { type Component, For, Show } from "solid-js";
import T from "@/translations";
import { getReleaseRoute } from "@/utils/route-helpers";

/**
 * A one-line note that the document is already in other open releases, with
 * a link to each so they can be checked before adding another.
 */
const ReleaseOverlapNotice: Component<{
	releases: ReleaseSummary[];
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<p class="flex items-start gap-2 border-t border-border pt-4 text-xs leading-4 text-body">
			<span class="flex h-4 shrink-0 items-center text-icon mt-0.5">
				<FaSolidCircleInfo size={12} />
			</span>
			<span title={T()("releases.overlap.description")}>
				{T()("releases.overlap.title", { count: props.releases.length })}{" "}
				<For each={props.releases}>
					{(release, index) => (
						<>
							<A
								href={getReleaseRoute({ releaseId: release.id })}
								class="text-xs text-title underline-offset-2 hover:underline"
							>
								{release.title}
							</A>
							<Show when={index() < props.releases.length - 1}>, </Show>
						</>
					)}
				</For>
			</span>
		</p>
	);
};

export default ReleaseOverlapNotice;
