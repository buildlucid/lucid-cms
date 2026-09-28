import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import { toolLabel } from "@/components/AgentMessage/parts/AgentToolCall";
import AgentSidebarCard from "@/components/AgentSidebarCard/AgentSidebarCard";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";
import {
	type AgentToolPart,
	isWebFetchOutput,
	isWebSearchOutput,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-chat";
import WebFetchView from "./parts/WebFetchView";
import WebSearchView from "./parts/WebSearchView";

/**
 * A tool call in the chat's sidebar. Web research shows the pages it found or
 * read, with its query or site as the title. Other tools show their status,
 * input and output.
 */
const AgentToolPanel: Component<{
	part: AgentToolPart;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo((): { label: string; variant: PillVariant } => {
		switch (props.part.status) {
			case "pending":
				return { label: T()("agent.tool.status.pending"), variant: "neutral" };
			case "running":
				return {
					label: T()("agent.tool.status.running"),
					variant: "info-subtle",
				};
			case "complete":
				return {
					label: T()("agent.tool.status.complete"),
					variant: "success-subtle",
				};
			case "failed":
				return {
					label: T()("agent.tool.status.failed"),
					variant: "danger-subtle",
				};
			case "skipped":
				return { label: T()("agent.tool.status.skipped"), variant: "neutral" };
		}
	});
	const error = createMemo(() => {
		const output = props.part.output;
		return props.part.status === "failed" &&
			typeof output === "object" &&
			output !== null &&
			"error" in output &&
			typeof output.error === "string"
			? output.error
			: undefined;
	});
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
			onClose={props.onClose}
			class={props.class}
		>
			<Show when={!isWeb()}>
				<div class="-mt-3 flex flex-wrap items-center gap-2">
					<Pill size="xs" variant={status().variant}>
						{status().label}
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
						<section class="flex flex-col gap-2">
							<h4 class="text-xs font-medium text-subtitle">
								{T()("agent.tool.input")}
							</h4>
							<JSONPreview json={props.part.input} />
						</section>
						<section class="flex flex-col gap-2">
							<h4 class="text-xs font-medium text-subtitle">
								{T()("agent.tool.output")}
							</h4>
							<Show
								when={props.part.output !== undefined}
								fallback={
									<p class="text-sm text-muted">
										{T()(
											props.part.status === "pending" ||
												props.part.status === "running"
												? "agent.tool.output.waiting"
												: "agent.tool.output.none",
										)}
									</p>
								}
							>
								<JSONPreview json={props.part.output} />
							</Show>
						</section>
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
