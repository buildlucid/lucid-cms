import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import AgentMarkdown from "@/components/AgentMessage/parts/AgentMarkdown";
import { toolLabel } from "@/components/AgentMessage/parts/AgentToolCall";
import AgentSidebarCard from "@/components/AgentSidebarCard/AgentSidebarCard";
import AgentToolDetails from "@/components/AgentToolDetails/AgentToolDetails";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import api from "@/services/api";
import T from "@/translations";
import {
	type AgentToolPart,
	analyzeMediaTool,
	isFileReadOutput,
	isWebFetchOutput,
	isWebSearchOutput,
	readFileTool,
	toolOutputText,
	webFetchTool,
	webSearchTool,
} from "@/utils/agent-tools";
import FileReadView from "./parts/FileReadView";
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
 * read, with its query or site as the title. File analysis shows its answer,
 * and file reading shows the passages it read.
 * Other tools show their status, with the raw input and output folded away.
 */
const AgentToolPanel: Component<{
	conversationId: string;
	messageId: string;
	part: AgentToolPart;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const details = api.agent.useGetToolDetails({
		conversationId: () => props.conversationId,
		messageId: () => props.messageId,
		tool: () => props.part,
	});

	// ----------------------------------------
	// Memos
	const output = createMemo(() => details.data?.data.output);
	const error = createMemo(() =>
		props.part.status === "failed"
			? toolOutputText(output(), "error")
			: undefined,
	);
	const analysis = createMemo(() =>
		props.part.name === analyzeMediaTool
			? toolOutputText(output(), "analysis")
			: undefined,
	);
	const isWeb = createMemo(
		() => props.part.name === webSearchTool || props.part.name === webFetchTool,
	);
	const searchOutput = createMemo(() => {
		const value = output();
		return props.part.name === webSearchTool && isWebSearchOutput(value)
			? value
			: undefined;
	});
	const fetchOutput = createMemo(() => {
		const value = output();
		return props.part.name === webFetchTool && isWebFetchOutput(value)
			? value
			: undefined;
	});
	const fileOutput = createMemo(() => {
		const value = output();
		return props.part.name === readFileTool && isFileReadOutput(value)
			? value
			: undefined;
	});

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
			<Switch>
				<Match when={details.isError}>
					<ErrorMessage
						theme="inline"
						icon={false}
						message={T()("agent.tool.details.unavailable")}
					/>
					<Button
						variant="secondary"
						size="xs"
						onClick={() => void details.refetch()}
					>
						{T()("agent.error.retry")}
					</Button>
				</Match>
				<Match when={props.part.detailsAvailable && details.isPending}>
					<div
						class="skeleton-shimmer h-7 w-full rounded-md"
						aria-hidden="true"
					/>
				</Match>
				<Match when={details.isSuccess}>
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
								<Show
									when={
										output() === undefined &&
										props.part.status !== "pending" &&
										props.part.status !== "running"
									}
								>
									<p class="text-sm text-muted">
										{T()("agent.tool.output.none")}
									</p>
								</Show>
								<AgentToolDetails
									sections={[
										{
											label: T()("agent.tool.input"),
											value: details.data?.data.input,
										},
										{ label: T()("agent.tool.output"), value: output() },
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
						<Match when={fileOutput()}>
							{(output) => (
								<FileReadView
									output={output()}
									search={toolOutputText(details.data?.data.input, "search")}
								/>
							)}
						</Match>
					</Switch>
				</Match>
			</Switch>
		</AgentSidebarCard>
	);
};

export default AgentToolPanel;
