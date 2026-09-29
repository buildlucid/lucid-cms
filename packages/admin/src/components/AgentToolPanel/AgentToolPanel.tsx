import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import AgentMarkdown from "@/components/AgentMessage/parts/AgentMarkdown";
import { toolLabel } from "@/components/AgentMessage/parts/AgentToolCall";
import AgentSidebarCard from "@/components/AgentSidebarCard/AgentSidebarCard";
import AgentToolDetails from "@/components/AgentToolDetails/AgentToolDetails";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";
import {
	type AgentToolPart,
	analyzeResourceTool,
	isWebFetchOutput,
	isWebSearchOutput,
	toolOutputText,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-tools";
import WebFetchView from "./parts/WebFetchView";
import WebSearchView from "./parts/WebSearchView";

const statusVariants = {
	pending: "neutral",
	running: "info-subtle",
	complete: "success-subtle",
	failed: "danger-subtle",
	skipped: "neutral",
} satisfies Record<AgentToolPart["status"], PillVariant>;

/**
 * A tool call in the chat's sidebar. Web research shows the pages it found or
 * read, with its query or site as the title. File analysis shows its answer.
 * Other tools show their status, with the raw input and output folded away.
 */
const AgentToolPanel: Component<{
	part: AgentToolPart;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const error = createMemo(() =>
		props.part.status === "failed"
			? toolOutputText(props.part.output, "error")
			: undefined,
	);
	const analysis = createMemo(() =>
		props.part.name === analyzeResourceTool
			? toolOutputText(props.part.output, "analysis")
			: undefined,
	);
	const isWeb = createMemo(
		() => props.part.name === webSearchTool || props.part.name === webFetchTool,
	);
	const searchOutput = createMemo(() =>
		props.part.name === webSearchTool && isWebSearchOutput(props.part.output)
			? props.part.output
			: undefined,
	);
	const fetchOutput = createMemo(() =>
		props.part.name === webFetchTool && isWebFetchOutput(props.part.output)
			? props.part.output
			: undefined,
	);

	// ----------------------------------------
	// Render
	return (
		<AgentSidebarCard
			title={toolLabel(props.part)}
			reveal={props.part.id}
			onClose={props.onClose}
			class={props.class}
		>
			<Show when={!isWeb()}>
				<div class="-mt-3 flex flex-wrap items-center gap-2">
					<Pill size="xs" variant={statusVariants[props.part.status]}>
						{T()(`agent.tool.status.${props.part.status}`)}
					</Pill>
					<code class="rounded bg-input px-1.5 py-0.5 text-[11px] text-body">
						{props.part.name}
					</code>
				</div>
			</Show>
			<Show when={error()}>
				{(message) => (
					<ErrorMessage theme="inline" icon={false} message={message()} />
				)}
			</Show>
			<Switch
				fallback={
					<Show when={!isWeb()}>
						<Show when={analysis()}>
							{(text) => <AgentMarkdown text={text()} size="sm" />}
						</Show>
						<Show when={props.part.output === undefined}>
							<p class="text-sm text-muted">
								{T()(
									props.part.status === "pending" ||
										props.part.status === "running"
										? "agent.tool.output.waiting"
										: "agent.tool.output.none",
								)}
							</p>
						</Show>
						<AgentToolDetails
							sections={[
								{ label: T()("agent.tool.input"), value: props.part.input },
								{ label: T()("agent.tool.output"), value: props.part.output },
							]}
						/>
					</Show>
				}
			>
				<Match when={searchOutput()}>
					{(output) => (
						<div class="-mt-3 flex flex-col gap-2.5">
							<p class="text-[11px] text-muted">
								{T()("agent.web.sources.count", {
									count: output().results.length,
								})}
							</p>
							<WebSearchView output={output()} />
						</div>
					)}
				</Match>
				<Match when={fetchOutput()}>
					{(output) => (
						<div class="-mt-3 flex flex-col gap-3">
							<WebFetchView output={output()} />
						</div>
					)}
				</Match>
			</Switch>
		</AgentSidebarCard>
	);
};

export default AgentToolPanel;
