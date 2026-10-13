import type { Agent, AgentRoutine } from "@types";
import { type Component, createMemo, For } from "solid-js";
import Select from "@/components/Select/Select";
import UnavailableGrants from "@/components/UnavailableGrants/UnavailableGrants";
import T, { translateAdminCopy } from "@/translations";

type Tool = Agent["tools"][number];
type ToolSettings = AgentRoutine["toolSettings"];
type Choice = "default" | "ask" | "run";

/** Chooses a routine's tool confirmations, with "Default" removing overrides so each tool's own policy applies. */
const AgentRoutineToolConfirmations: Component<{
	tools: Agent["tools"];
	value: ToolSettings;
	onChange: (value: ToolSettings) => void;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const unavailable = createMemo(() =>
		Object.keys(props.value).filter(
			(name) => !props.tools.some((tool) => tool.name === name),
		),
	);

	// ----------------------------------------
	// Functions
	const choiceFor = (tool: Tool): Choice => {
		const requiresConfirmation = props.value[tool.name]?.requiresConfirmation;
		if (requiresConfirmation === undefined) return "default";
		return requiresConfirmation ? "ask" : "run";
	};
	const setChoice = (tool: Tool, choice: Choice) => {
		const { [tool.name]: _, ...rest } = props.value;
		props.onChange(
			choice === "default"
				? rest
				: { ...rest, [tool.name]: { requiresConfirmation: choice === "ask" } },
		);
	};
	const removeTool = (name: string) => {
		const { [name]: _, ...rest } = props.value;
		props.onChange(rest);
	};

	// ----------------------------------------
	// Render
	return (
		<section id="agent-routine-tool-confirmations" class="mt-2 w-full">
			<UnavailableGrants
				keys={unavailable()}
				title={T()("agent.routine.confirmations.unavailable.title")}
				description={T()("agent.routine.confirmations.unavailable.description")}
				onRemove={removeTool}
				disabled={props.disabled}
			/>
			<div class="rounded-md border border-border bg-card">
				<ul class="divide-y divide-border">
					<For each={props.tools}>
						{(tool) => (
							<li class="group flex items-center justify-between gap-3 px-3 py-2">
								<label
									for={`routine-tool-${tool.name}`}
									class="min-w-0 truncate text-sm text-body transition-colors duration-200 ease-in-out group-focus-within:text-primary-hover"
								>
									{translateAdminCopy(tool.title)}
								</label>
								<Select
									id={`routine-tool-${tool.name}`}
									name={`tools.${tool.name}`}
									size="sm"
									class="w-48 shrink-0"
									disabled={props.disabled}
									value={choiceFor(tool)}
									options={[
										{
											value: "default",
											label: T()(
												tool.requiresConfirmation
													? "agent.routine.confirmations.option.default.ask"
													: "agent.routine.confirmations.option.default.run",
											),
										},
										{
											value: "ask",
											label: T()("agent.routine.confirmations.option.ask"),
										},
										{
											value: "run",
											label: T()("agent.routine.confirmations.option.run"),
										},
									]}
									onChange={(value) => {
										if (
											value === "default" ||
											value === "ask" ||
											value === "run"
										) {
											setChoice(tool, value);
										}
									}}
								/>
							</li>
						)}
					</For>
				</ul>
			</div>
		</section>
	);
};

export default AgentRoutineToolConfirmations;
