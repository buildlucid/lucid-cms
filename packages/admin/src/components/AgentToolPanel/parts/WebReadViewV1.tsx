import type { AgentWebReadOutput } from "@lucidcms/types";
import { type Component, Show } from "solid-js";
import AgentMarkdown from "@/components/AgentMarkdown/AgentMarkdown";
import WebSourceRow from "@/components/WebSourceRow/WebSourceRow";
import dateHelpers from "@/utils/date-helpers";

const previewChars = 600;

/** Shows a webpage link and a height-limited markdown preview without loading remote images. */
const WebReadViewV1: Component<{ output: AgentWebReadOutput }> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<WebSourceRow
				url={props.output.url}
				title={props.output.title}
				meta={dateHelpers.formatDate(props.output.publishedAt, {
					localDateOnly: true,
				})}
			/>
			<div class="relative max-h-48 overflow-hidden">
				<AgentMarkdown text={props.output.content} size="sm" />
				<Show when={props.output.content.length > previewChars}>
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-card to-transparent"
					/>
				</Show>
			</div>
		</>
	);
};

export default WebReadViewV1;
