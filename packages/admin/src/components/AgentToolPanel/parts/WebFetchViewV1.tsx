import type { AgentWebFetchOutput } from "@types";
import { type Component, Show } from "solid-js";
import AgentMarkdown from "@/components/AgentMessage/parts/AgentMarkdown";
import dateHelpers from "@/utils/date-helpers";
import WebSourceRow from "./WebSourceRow";

const previewChars = 600;

/**
 * A webpage the agent read: the page, then the start of what it got back. The
 * preview is short on purpose; the page itself is a click away. Fetched
 * Markdown renders without images, so viewing it never loads third-party
 * content.
 */
const WebFetchViewV1: Component<{ output: AgentWebFetchOutput }> = (props) => {
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

export default WebFetchViewV1;
