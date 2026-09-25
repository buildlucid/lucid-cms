import type { AgentMessage as AgentMessageData } from "@types";
import { type Component, For, Match, Show, Switch } from "solid-js";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import AgentMarkdown from "./parts/AgentMarkdown";
import AgentQuestion from "./parts/AgentQuestion";
import AgentRunFinish from "./parts/AgentRunFinish";
import AgentToolCall from "./parts/AgentToolCall";

//* built-in tools that render as their own cards rather than tool rows
const askTool = "lucid_ask_user";
const finishTool = "lucid_finish_run";

export interface AgentMessageProps {
	message: AgentMessageData;
	/** The id of the question the run is waiting on. */
	pendingQuestionId?: string;
	onAnswer?: (answer: string) => void;
}

/** One message in a conversation: the user's text, or the agent's reply with its tools, questions and widgets. */
const AgentMessage: Component<AgentMessageProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.message.role === "assistant"}
			fallback={
				<div class="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-input px-4 py-2.5 text-sm leading-6 text-title">
					<For each={props.message.parts}>
						{(part) => (part.type === "text" ? part.text : null)}
					</For>
				</div>
			}
		>
			<div class="flex w-full flex-col gap-3">
				<For each={props.message.parts}>
					{(part) => (
						<Switch>
							<Match when={part.type === "text" && part}>
								{(text) => <AgentMarkdown text={text().text} />}
							</Match>
							<Match
								when={part.type === "tool" && part.name === finishTool && part}
							>
								{(tool) => <AgentRunFinish part={tool()} />}
							</Match>
							<Match
								when={part.type === "tool" && part.name !== askTool && part}
							>
								{(tool) => <AgentToolCall part={tool()} />}
							</Match>
							<Match when={part.type === "question" && part}>
								{(question) => (
									<AgentQuestion
										part={question()}
										pending={props.pendingQuestionId === question().id}
										onAnswer={props.onAnswer}
									/>
								)}
							</Match>
							<Match when={part.type === "widget" && part}>
								{(widget) => (
									<AgentWidget
										key={widget().key}
										version={widget().version}
										data={widget().data}
									/>
								)}
							</Match>
						</Switch>
					)}
				</For>
			</div>
		</Show>
	);
};

export default AgentMessage;
