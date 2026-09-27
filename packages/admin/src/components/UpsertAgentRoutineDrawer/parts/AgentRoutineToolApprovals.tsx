import type { Agent, AgentRoutine } from "@types";
import { FaSolidArrowRotateLeft } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Select from "@/components/Select/Select";
import UnavailableGrants from "@/components/UnavailableGrants/UnavailableGrants";
import T, { translateAdminCopy } from "@/translations";

type Tool = Agent["tools"][number];
type RoutineTools = AgentRoutine["tools"];
type Choice = "default" | "ask" | "run";

/** Chooses whether each tool asks for approval in a routine. "Default" removes the setting so the tool's own default applies. */
const AgentRoutineToolApprovals: Component<{
	tools: Agent["tools"];
	value: RoutineTools;
	onChange: (value: RoutineTools) => void;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const unavailable = createMemo(() =>
		Object.keys(props.value).filter(
			(name) => !props.tools.some((tool) => tool.name === name),
		),
	);
	const hasInteractive = createMemo(() =>
		props.tools.some((tool) => tool.interactive),
	);

	// ----------------------------------------
	// Functions
	const choiceFor = (tool: Tool): Choice => {
		const requiresApproval = props.value[tool.name]?.requiresApproval;
		if (requiresApproval === undefined) return "default";
		return requiresApproval ? "ask" : "run";
	};
	const setChoice = (tool: Tool, choice: Choice) => {
		const { [tool.name]: _, ...rest } = props.value;
		props.onChange(
			choice === "default"
				? rest
				: { ...rest, [tool.name]: { requiresApproval: choice === "ask" } },
		);
	};
	const removeTool = (name: string) => {
		const { [name]: _, ...rest } = props.value;
		props.onChange(rest);
	};

	// ----------------------------------------
	// Render
	return (
		<section id="agent-routine-tool-approvals" class="mt-2 w-full">
			<SectionHeading
				level={3}
				title={T()("agent.routine.approvals.title")}
				description={`${T()("agent.routine.approvals.description")}${
					hasInteractive()
						? ` ${T()("agent.routine.approvals.interactive")}`
						: ""
				}`}
				actions={
					<Show when={!props.disabled && Object.keys(props.value).length > 0}>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							shape="square"
							class="shrink-0"
							title={T()("agent.routine.approvals.reset")}
							aria-label={T()("agent.routine.approvals.reset")}
							onClick={() => props.onChange({})}
						>
							<FaSolidArrowRotateLeft size={12} />
						</Button>
					</Show>
				}
			/>
			<UnavailableGrants
				keys={unavailable()}
				title={T()("agent.routine.approvals.unavailable.title")}
				description={T()("agent.routine.approvals.unavailable.description")}
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
									//* matches FormLabel, which turns primary while its field is focused
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
												tool.requiresApproval
													? "agent.routine.approvals.option.default.ask"
													: "agent.routine.approvals.option.default.run",
											),
										},
										{
											value: "ask",
											label: T()("agent.routine.approvals.option.ask"),
										},
										{
											value: "run",
											label: T()("agent.routine.approvals.option.run"),
										},
									]}
									onChange={(value) => {
										if (
											value === "default" ||
											value === "ask" ||
											value === "run"
										)
											setChoice(tool, value);
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

export default AgentRoutineToolApprovals;
