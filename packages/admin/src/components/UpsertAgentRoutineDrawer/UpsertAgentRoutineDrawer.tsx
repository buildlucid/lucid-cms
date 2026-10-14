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
import RadioCards from "@/components/RadioCards/RadioCards";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import {
	type RoutineEventDraft,
	toRoutineEvent,
	toRoutineEventDraft,
} from "@/utils/agent-routine-events";
import {
	defaultSchedule,
	parseSchedule,
	type Schedule,
	toCron,
} from "@/utils/agent-schedule";
import { getBodyError } from "@/utils/error-helpers";
import { getDefaultTimezone } from "@/utils/request-schedule";
import AgentRoutineDetails from "./parts/AgentRoutineDetails";
import AgentRoutineEventsField from "./parts/AgentRoutineEventsField";
import AgentRoutineInstructions from "./parts/AgentRoutineInstructions";
import AgentRoutineModelField from "./parts/AgentRoutineModelField";
import AgentRoutineToolConfirmations from "./parts/AgentRoutineToolConfirmations";
import AgentScheduleField from "./parts/AgentScheduleField";

/** Creates a routine or edits the supplied `routine`, keeping code routines read only. */
const UpsertAgentRoutineDrawer: Component<{
	routine?: Accessor<AgentRoutine | undefined>;
	focusConfirmations?: boolean;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [agentKey, setAgentKey] = createSignal<string>();
	const [name, setName] = createSignal("");
	const [conversationMode, setConversationMode] =
		createSignal<AgentRoutineConversationMode>("new");
	const [instructions, setInstructions] = createSignal("");
	const [modelSelection, setModelSelection] =
		createSignal<AiModelSelection | null>(null);
	const [scheduled, setScheduled] = createSignal(true);
	const [schedule, setSchedule] = createSignal<Schedule>(defaultSchedule);
	const [events, setEvents] = createSignal<RoutineEventDraft[]>([]);
	const [timezone, setTimezone] = createSignal(getDefaultTimezone());
	const [enabled, setEnabled] = createSignal(true);
	const [toolSettings, setToolSettings] = createSignal<
		AgentRoutine["toolSettings"]
	>({});
	const [activeTab, setActiveTab] = createSignal("task");

	// ----------------------------------------
	// Queries & Mutations
	const close = () => props.state.setOpen(false);
	const createRoutine = api.agent.useCreateRoutine({ onSuccess: close });
	const updateRoutine = api.agent.useUpdateRoutine({ onSuccess: close });
	const definitions = api.agent.useGetDefinitions({
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Memos
	const existing = createMemo(() => props.routine?.());
	const overseeing = createMemo(() => existing()?.access === "oversight");
	//* settings require owner access; other modes allow pausing or resuming
	const locked = createMemo(
		() => existing() !== undefined && existing()?.access !== "owner",
	);
	const agents = createMemo(() => getAgentAccess().ownRoutines);
	const mutation = createMemo(() =>
		existing() ? updateRoutine : createRoutine,
	);
	const errors = createMemo(() => mutation().errors());
	const incomplete = createMemo(
		() =>
			!name().trim() ||
			!instructions().trim() ||
			(!scheduled() && events().length === 0),
	);
	const tabInvalid = (fields: string[]) =>
		fields.some((field) => getBodyError(field, errors) !== undefined);
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
				setToolSettings(routine?.toolSettings ?? {});
				setName(routine?.name ?? "");
				setInstructions(routine?.instructions ?? "");
				setConversationMode(routine?.conversationMode ?? "new");
				setModelSelection(routine?.modelSelection ?? null);
				setScheduled(routine ? routine.schedule !== null : true);
				setSchedule(
					routine?.schedule
						? parseSchedule(routine.schedule.cron)
						: defaultSchedule,
				);
				setTimezone(routine?.schedule?.timezone ?? getDefaultTimezone());
				setEvents(routine?.events.map(toRoutineEventDraft) ?? []);
				setEnabled(routine?.enabled ?? true);
				setActiveTab(props.focusConfirmations ? "confirmations" : "task");
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
			<Drawer.Header border={false}>
				<Drawer.Title>
					{locked()
						? T()("panels.agent.routine.view.title")
						: existing()
							? T()("panels.agent.routine.update.title")
							: T()("panels.agent.routine.create.title")}
				</Drawer.Title>
				<Drawer.Description>
					{overseeing()
						? T()("panels.agent.routine.oversight.description")
						: locked()
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
						schedule: scheduled()
							? { cron: toCron(schedule()), timezone: timezone() }
							: null,
						events: events().map(toRoutineEvent),
						enabled: enabled(),
						toolSettings: toolSettings(),
					};
					const routine = existing();
					const key = agentKey();
					if (routine) {
						updateRoutine.action.mutate({
							id: routine.id,
							body: locked() ? { enabled: body.enabled } : body,
						});
					} else if (key) {
						createRoutine.action.mutate({ ...body, agentKey: key });
					}
				}}
			>
				<Drawer.Body class="flex flex-col gap-4">
					<Drawer.Tabs
						items={[
							{
								value: "task",
								label: T()(
									locked() ? "common.details" : "agent.routine.tab.task",
								),
								invalid: tabInvalid(["agentKey", "name", "instructions"]),
							},
							{
								value: "triggers",
								label: T()("agent.routine.triggers"),
								invalid: tabInvalid(["schedule", "events", "enabled"]),
							},
							{
								value: "confirmations",
								label: T()("agent.routine.confirmations.title"),
								invalid: tabInvalid(["toolSettings"]),
							},
							{
								value: "options",
								label: T()("common.options"),
								invalid: tabInvalid(["modelSelection", "conversationMode"]),
								show: !locked(),
							},
						]}
						value={activeTab()}
						onChange={setActiveTab}
					/>
					<Show when={activeTab() === "task"}>
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
											setToolSettings({});
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
							<AgentRoutineInstructions
								value={instructions()}
								onChange={setInstructions}
								errors={getBodyError("instructions", errors)}
							/>
						</Show>
					</Show>
					<Show when={activeTab() === "triggers"}>
						{/* new routines start active; pausing an existing routine stops schedules and events */}
						<Show when={existing()}>
							<RadioCards
								id="agent-routine-enabled"
								name="enabled"
								label={T()("common.status")}
								columns={2}
								value={enabled() ? "active" : "paused"}
								onChange={(value) => setEnabled(value === "active")}
								options={[
									{
										value: "active",
										label: T()("agent.routine.active"),
										description: T()("agent.routine.active.description"),
									},
									{
										value: "paused",
										label: T()("agent.routine.paused"),
										description: T()("agent.routine.paused.description"),
									},
								]}
								errors={getBodyError("enabled", errors)}
							/>
						</Show>
						<Show when={!locked()}>
							<section>
								<SectionHeading title={T()("common.schedule")} level={3} />
								<RadioCards
									id="agent-routine-scheduled"
									name="scheduled"
									columns={2}
									value={scheduled() ? "scheduled" : "none"}
									onChange={(value) => setScheduled(value === "scheduled")}
									options={[
										{
											value: "scheduled",
											label: T()("agent.routine.schedule.enabled"),
											description: T()(
												"agent.routine.schedule.enabled.description",
											),
										},
										{
											value: "none",
											label: T()("agent.routine.schedule.none"),
											description: T()(
												"agent.routine.schedule.none.description",
											),
										},
									]}
								/>
							</section>
							<Show when={scheduled()}>
								<AgentScheduleField
									schedule={schedule()}
									setSchedule={setSchedule}
									timezone={timezone()}
									setTimezone={setTimezone}
									errors={getBodyError("schedule", errors)}
								/>
							</Show>
							<AgentRoutineEventsField
								value={events()}
								onChange={setEvents}
								errors={getBodyError("events", errors)?.children}
							/>
							{/* a routine requires a schedule or an event */}
							<Show when={!scheduled() && events().length === 0}>
								<p class="text-sm text-muted">
									{T()("agent.routine.trigger.required")}
								</p>
							</Show>
						</Show>
					</Show>
					<Show when={activeTab() === "confirmations"}>
						<AgentRoutineToolConfirmations
							tools={agentTools()}
							value={toolSettings()}
							onChange={setToolSettings}
							disabled={locked()}
						/>
					</Show>
					<Show when={activeTab() === "options" && !locked()}>
						<AgentRoutineModelField
							agentKey={props.state.open ? agentKey() : undefined}
							value={modelSelection()}
							onChange={setModelSelection}
							errors={getBodyError("modelSelection", errors)}
						/>
						<RadioCards
							id="agent-routine-conversation-mode"
							name="conversationMode"
							label={T()("agent.routine.conversation.label")}
							value={conversationMode()}
							onChange={setConversationMode}
							options={[
								{
									value: "new",
									label: T()("agent.routine.conversation.new"),
									description: T()(
										"agent.routine.conversation.new.description",
									),
								},
								{
									value: "reuse",
									label: T()("agent.routine.conversation.reuse"),
									description: T()(
										"agent.routine.conversation.reuse.description",
									),
								},
							]}
							errors={getBodyError("conversationMode", errors)}
						/>
					</Show>
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
							disabled={!locked() && incomplete()}
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
