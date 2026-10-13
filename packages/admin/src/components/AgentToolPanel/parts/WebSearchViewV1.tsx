import type { AgentWebSearchOutput } from "@lucidcms/types";
import { type Component, For, Show } from "solid-js";
import WebSourceRow from "@/components/WebSourceRow/WebSourceRow";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const WebSearchViewV1: Component<{ output: AgentWebSearchOutput }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.output.results.length > 0}
			fallback={
				<p class="text-xs text-muted">{T()("agent.web.sources.none")}</p>
			}
		>
			<ol class="flex flex-col">
				<For each={props.output.results}>
					{(result) => (
						<li>
							<WebSourceRow
								url={result.url}
								title={result.title}
								meta={dateHelpers.formatDate(result.publishedAt, {
									localDateOnly: true,
								})}
							/>
						</li>
					)}
				</For>
			</ol>
		</Show>
	);
};

export default WebSearchViewV1;
