import { A } from "@solidjs/router";
import type { ReleaseSummary } from "@types";
import { FaSolidSquareArrowUpRight } from "solid-icons/fa";
import { type Component, For, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import { getReleaseState, releaseStates } from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";

/**
 * A short list of releases for sidebars, shaped like the chat's document
 * references: a small release mark, the title, and its status below.
 */
const ReleaseCompactList: Component<{
	releases: ReleaseSummary[];
	loading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div>
			<Show when={props.loading}>
				<span class="block h-12 skeleton rounded-md" />
			</Show>
			<Show when={!props.loading && props.releases.length === 0}>
				<p class="text-xs text-muted">{T()("releases.document.none")}</p>
			</Show>
			<ul class="flex flex-col gap-0.5">
				<For each={props.releases}>
					{(release) => (
						<li>
							<A
								href={getReleaseRoute({ releaseId: release.id })}
								class="-mx-1.5 flex min-w-0 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							>
								<span
									aria-hidden="true"
									class="flex h-9 w-7 shrink-0 items-center justify-center rounded border border-border bg-input text-muted fill-muted"
								>
									<FaSolidSquareArrowUpRight size={10} />
								</span>
								<span class="flex min-w-0 grow flex-col">
									<span class="truncate text-xs text-title">
										{release.title}
									</span>
									<span class="flex items-center gap-1.5 truncate text-[11px] leading-4 text-muted">
										<StatusIndicator
											size="xs"
											variant={
												releaseStates[getReleaseState(release)].indicator
											}
										/>
										{releaseStates[getReleaseState(release)].label()}
										<span aria-hidden="true">·</span>
										{T()("releases.documents.count", {
											count: release.documents.length,
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

export default ReleaseCompactList;
