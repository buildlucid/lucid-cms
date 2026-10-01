import type { AiModelSelection, ErrorResult, FieldError } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import { effortFor, selectModel } from "@/utils/agent-models";

type ModelOption = { value: string; label: string; description?: string };

/** Picks the model and reasoning effort a routine runs with. Empty follows the agent's default. */
const AgentRoutineModelField: Component<{
	agentKey?: string;
	value: AiModelSelection | null;
	onChange: (_value: AiModelSelection | null) => void;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const query = api.agent.useGetModels({ agentKey: () => props.agentKey });

	// ----------------------------------------
	// Memos
	const catalog = createMemo(() =>
		query.isSuccess ? query.data.data : undefined,
	);
	const unavailable = createMemo(
		() => getAgentUnavailableReason() !== undefined,
	);
	const model = createMemo(() =>
		catalog()?.models.find((model) => model.id === props.value?.modelId),
	);
	const defaultLabel = createMemo(() => {
		const name = catalog()?.models.find(
			(model) => model.id === catalog()?.default.modelId,
		)?.name;
		return name
			? T()("agent.models.default", { name })
			: T()("agent.models.default.plain");
	});
	const modelOptions = createMemo((): ModelOption[] => {
		const models = catalog()?.models;
		//* without the catalogue, the saved choice is still shown by its ID
		if (!models) {
			return props.value
				? [{ value: props.value.modelId, label: props.value.modelId }]
				: [];
		}
		return [
			{ value: "", label: defaultLabel() },
			...models.map((model) => ({
				value: model.id,
				label: model.name,
				description: model.description,
			})),
		];
	});
	const effortOptions = createMemo(
		() =>
			model()?.reasoningEfforts.map((effort) => ({
				value: effort,
				label: T()(`agent.models.effort.${effort}`),
			})) ?? [],
	);

	// ----------------------------------------
	// Render
	return (
		//* the model takes the full row when there is no reasoning to choose
		<div class="grid items-start gap-3 md:grid-cols-2">
			<Select<ModelOption>
				class={effortOptions().length ? undefined : "md:col-span-2"}
				id="agent-routine-model"
				name="modelId"
				value={props.value?.modelId ?? ""}
				onChange={(value) => {
					const next = catalog()?.models.find((model) => model.id === value);
					props.onChange(
						next ? selectModel(next, props.value?.reasoningEffort) : null,
					);
				}}
				options={modelOptions()}
				placeholder={defaultLabel()}
				label={T()("agent.models.label")}
				description={
					unavailable()
						? T()("agent.models.unavailable.connection")
						: query.isError
							? T()("agent.models.unavailable")
							: T()("agent.models.routine.description")
				}
				disabled={props.disabled || !catalog()}
				errors={props.errors}
				renderOption={(option) => (
					<span class="flex flex-col">
						<span>{option.option.label}</span>
						<Show when={option.option.description}>
							<span class="whitespace-normal text-xs text-muted">
								{option.option.description}
							</span>
						</Show>
					</span>
				)}
			/>
			<Show when={effortOptions().length ? model() : undefined}>
				{(current) => (
					<Select
						id="agent-routine-effort"
						name="reasoningEffort"
						value={
							effortFor(current(), props.value?.reasoningEffort) ?? undefined
						}
						onChange={(value) => {
							const effort = current().reasoningEfforts.find(
								(option) => option === value,
							);
							if (effort) {
								props.onChange({
									modelId: current().id,
									reasoningEffort: effort,
								});
							}
						}}
						options={effortOptions()}
						label={T()("agent.models.effort")}
						disabled={props.disabled}
					/>
				)}
			</Show>
		</div>
	);
};

export default AgentRoutineModelField;
