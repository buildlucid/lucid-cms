import type { AgentRoutine } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Switch from "@/components/Switch/Switch";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import T from "@/translations";
import {
	defaultSchedule,
	parseSchedule,
	type Schedule,
	toCron,
} from "@/utils/agent-schedule";
import { getBodyError } from "@/utils/error-helpers";
import { getDefaultTimezone } from "@/utils/release-schedule";
import AgentScheduleField from "./parts/AgentScheduleField";

/** Creates a routine, or edits one when `routine` is set. */
const UpsertAgentRoutineDrawer: Component<{
	routine?: Accessor<AgentRoutine | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const [title, setTitle] = createSignal("");
	const [instructions, setInstructions] = createSignal("");
	const [schedule, setSchedule] = createSignal<Schedule>(defaultSchedule);
	const [timezone, setTimezone] = createSignal(getDefaultTimezone());
	const [enabled, setEnabled] = createSignal(true);

	// ----------------------------------------
	// Mutations
	const close = () => props.state.setOpen(false);
	const createRoutine = api.agent.useCreateRoutine({ onSuccess: close });
	const updateRoutine = api.agent.useUpdateRoutine({ onSuccess: close });

	// ----------------------------------------
	// Memos
	const existing = createMemo(() => props.routine?.());
	const mutation = createMemo(() =>
		existing() ? updateRoutine : createRoutine,
	);
	const errors = createMemo(() => mutation().errors());

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				const routine = untrack(existing);
				setTitle(routine?.title ?? "");
				setInstructions(routine?.instructions ?? "");
				setSchedule(routine ? parseSchedule(routine.cron) : defaultSchedule);
				setTimezone(routine?.timezone ?? getDefaultTimezone());
				setEnabled(routine?.enabled ?? true);
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			onReset={() => {
				createRoutine.reset();
				updateRoutine.reset();
			}}
		>
			<Drawer.Header>
				<Drawer.Title>
					{existing()
						? T()("panels.agent.routine.update.title")
						: T()("panels.agent.routine.create.title")}
				</Drawer.Title>
				<Drawer.Description>
					{T()("panels.agent.routine.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Form
				onSubmit={() => {
					const body = {
						title: title(),
						instructions: instructions(),
						cron: toCron(schedule()),
						timezone: timezone(),
						enabled: enabled(),
					};
					const routine = existing();
					if (routine) updateRoutine.action.mutate({ id: routine.id, body });
					else {
						createRoutine.action.mutate(body);
					}
				}}
			>
				<Drawer.Body class="flex flex-col gap-4">
					<Input
						id="agent-routine-title"
						name="title"
						type="text"
						value={title()}
						onChange={setTitle}
						required={true}
						label={T()("common.title")}
						errors={getBodyError("title", errors)}
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
					<AgentScheduleField
						schedule={schedule()}
						setSchedule={setSchedule}
						timezone={timezone()}
						setTimezone={setTimezone}
					/>
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
							disabled={!title().trim() || !instructions().trim()}
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
