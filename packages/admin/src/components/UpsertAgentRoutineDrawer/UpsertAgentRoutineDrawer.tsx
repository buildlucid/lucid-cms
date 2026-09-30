import type {
	AgentRoutine,
	AgentRoutineConversationMode,
	AiModelSelection,
} from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Select from "@/components/Select/Select";
import Switch from "@/components/Switch/Switch";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { conversationModeLabels, getAgentAccess } from "@/utils/agent-access";
import {
	defaultSchedule,
	parseSchedule,
	type Schedule,
	toCron,
} from "@/utils/agent-schedule";
import { getBodyError } from "@/utils/error-helpers";
import { getDefaultTimezone } from "@/utils/release-schedule";
import AgentRoutineDetails from "./parts/AgentRoutineDetails";
import AgentRoutineModelField from "./parts/AgentRoutineModelField";
import AgentRoutineToolApprovals from "./parts/AgentRoutineToolApprovals";
import AgentScheduleField from "./parts/AgentScheduleField";

/** Creates a routine, or edits one when `routine` is set. Code routines are read only. */
const UpsertAgentRoutineDrawer: Component<{
	routine?: Accessor<AgentRoutine | undefined>;
	focusApprovals?: boolean;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const [agentKey, setAgentKey] = createSignal<string>();
	const [name, setName] = createSignal("");
	const [conversationMode, setConversationMode] =
		createSignal<AgentRoutineConversationMode>("new");
	const [instructions, setInstructions] = createSignal("");
	const [modelSelection, setModelSelection] =
		createSignal<AiModelSelection | null>(null);
	const [schedule, setSchedule] = createSignal<Schedule>(defaultSchedule);
	const [timezone, setTimezone] = createSignal(getDefaultTimezone());
	const [enabled, setEnabled] = createSignal(true);
	const [routineTools, setRoutineTools] = createSignal<AgentRoutine["tools"]>(
		{},
	);

	// ----------------------------------------
	// Mutations
	const close = () => props.state.setOpen(false);
	const createRoutine = api.agent.useCreateRoutine({ onSuccess: close });
	const updateRoutine = api.agent.useUpdateRoutine({ onSuccess: close });
	const definitions = api.agent.useGetDefinitions({
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Memos
	const existing = createMemo(() => props.routine?.());
	const locked = createMemo(() => existing()?.source === "code");
	const agents = createMemo(() => getAgentAccess().use);
	const mutation = createMemo(() =>
		existing() ? updateRoutine : createRoutine,
	);
	const errors = createMemo(() => mutation().errors());
	const agentTools = createMemo(() => {
		const agent = definitions.data?.data.agents.find(
			(agent) => agent.key === (existing()?.agentKey ?? agentKey()),
		);
		return (agent?.tools ?? []).filter(
			(tool) =>
				locked() ||
				tool.permissions.length === 0 ||
				userStore.get.hasPermission(tool.permissions).all,
		);
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				const routine = untrack(existing);
				setAgentKey(routine?.agentKey ?? untrack(agents)[0]?.key);
				setRoutineTools(routine?.tools ?? {});
				setName(routine?.name ?? "");
				setInstructions(routine?.instructions ?? "");
				setConversationMode(routine?.conversationMode ?? "new");
				setModelSelection(routine?.modelSelection ?? null);
				setSchedule(routine ? parseSchedule(routine.cron) : defaultSchedule);
				setTimezone(routine?.timezone ?? getDefaultTimezone());
				setEnabled(routine?.enabled ?? true);
				if (props.focusApprovals) {
					requestAnimationFrame(() =>
						document
							.getElementById("agent-routine-tool-approvals")
							?.scrollIntoView({ block: "start" }),
					);
				}
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={definitions.isPending}
			error={
				definitions.isError ? T()("agent.definitions.load.error") : undefined
			}
			onReset={() => {
				createRoutine.reset();
				updateRoutine.reset();
			}}
		>
			<Drawer.Header>
				<Drawer.Title>
					{locked()
						? T()("panels.agent.routine.view.title")
						: existing()
							? T()("panels.agent.routine.update.title")
							: T()("panels.agent.routine.create.title")}
				</Drawer.Title>
				<Drawer.Description>
					{locked()
						? T()("panels.agent.routine.code.description")
						: T()("panels.agent.routine.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Form
				onSubmit={() => {
					const body = {
						name: name(),
						instructions: instructions(),
						conversationMode: conversationMode(),
						modelSelection: modelSelection(),
						cron: toCron(schedule()),
						timezone: timezone(),
						enabled: enabled(),
						tools: routineTools(),
					};
					const routine = existing();
					const key = agentKey();
					if (routine) {
						updateRoutine.action.mutate({
							id: routine.id,
							body: locked() ? { enabled: body.enabled } : body,
						});
					} else if (key)
						createRoutine.action.mutate({ ...body, agentKey: key });
				}}
			>
				<Drawer.Body class="flex flex-col gap-4">
					<Show
						when={!locked()}
						fallback={
							<Show when={existing()}>
								{(routine) => <AgentRoutineDetails routine={routine()} />}
							</Show>
						}
					>
						<Show when={!existing() && agents().length > 1}>
							<Select
								id="agent-routine-agent"
								name="agentKey"
								value={agentKey()}
								onChange={(value) => {
									if (value) {
										setAgentKey(String(value));
										setRoutineTools({});
										setModelSelection(null);
									}
								}}
								options={agents().map((agent) => ({
									value: agent.key,
									label: agent.name,
								}))}
								required={true}
								label={T()("agent.select.label")}
								errors={getBodyError("agentKey", errors)}
							/>
						</Show>
						<Input
							id="agent-routine-name"
							name="name"
							type="text"
							value={name()}
							onChange={setName}
							required={true}
							label={T()("common.name")}
							errors={getBodyError("name", errors)}
						/>
						<section class="mt-2">
							<SectionHeading
								level={3}
								title={T()("agent.routine.section.task.title")}
								description={T()("agent.routine.section.task.description")}
							/>
							<div class="flex flex-col gap-4">
								<AgentRoutineModelField
									agentKey={props.state.open ? agentKey() : undefined}
									value={modelSelection()}
									onChange={setModelSelection}
									errors={getBodyError("modelSelection", errors)}
								/>
								<Select
									id="agent-routine-conversation-mode"
									name="conversationMode"
									value={conversationMode()}
									onChange={(value) => {
										if (value === "new" || value === "reuse") {
											setConversationMode(value);
										}
									}}
									options={[
										{
											value: "new",
											label: T()(conversationModeLabels.new),
										},
										{
											value: "reuse",
											label: T()(conversationModeLabels.reuse),
										},
									]}
									label={T()("agent.routine.conversation.label")}
									description={T()(
										conversationMode() === "reuse"
											? "agent.routine.conversation.reuse.description"
											: "agent.routine.conversation.new.description",
									)}
									errors={getBodyError("conversationMode", errors)}
								/>
								<Textarea
									id="agent-routine-instructions"
									name="instructions"
									value={instructions()}
									onChange={setInstructions}
									rows={8}
									required={true}
									label={T()("agent.routine.instructions")}
									description={T()("agent.routine.instructions.description")}
									errors={getBodyError("instructions", errors)}
								/>
							</div>
						</section>
					</Show>
					<section class="mt-2">
						<SectionHeading
							level={3}
							title={T()("common.schedule")}
							description={T()("agent.routine.section.schedule.description")}
						/>
						<div class="flex flex-col gap-4">
							<Show when={!locked()}>
								<AgentScheduleField
									schedule={schedule()}
									setSchedule={setSchedule}
									timezone={timezone()}
									setTimezone={setTimezone}
								/>
							</Show>
							<Switch
								id="agent-routine-enabled"
								name="enabled"
								value={enabled()}
								onChange={setEnabled}
								trueLabel={T()("common.yes")}
								falseLabel={T()("common.no")}
								label={T()("agent.routine.enabled")}
								description={T()("agent.routine.enabled.description")}
							/>
						</div>
					</section>
					<AgentRoutineToolApprovals
						tools={agentTools()}
						value={routineTools()}
						onChange={setRoutineTools}
						disabled={locked()}
					/>
				</Drawer.Body>
				<Drawer.Footer>
					<ErrorMessage theme="basic" message={errors()?.message} />
					<Drawer.Actions>
						<Button variant="outline" onClick={close}>
							{T()("common.close")}
						</Button>
						<Button
							type="submit"
							loading={mutation().action.isPending}
							disabled={!locked() && (!name().trim() || !instructions().trim())}
						>
							{existing() ? T()("common.update") : T()("common.create")}
						</Button>
					</Drawer.Actions>
				</Drawer.Footer>
			</Drawer.Form>
		</Drawer.Root>
	);
};

export default UpsertAgentRoutineDrawer;
