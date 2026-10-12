import { Slider as KobalteSlider } from "@kobalte/core";
import type { AiModelSelection } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import ModelPicker from "@/components/ModelPicker/ModelPicker";
import api from "@/services/api";
import T from "@/translations";
import { effortFor, selectModel } from "@/utils/agent-models";

/** Chooses the model and reasoning effort for a chat's next reply, from the composer toolbar. */
const AgentModelPicker: Component<{
	agentKey: string;
	routineId?: string;
	/** Null follows the routine or agent default. */
	value: AiModelSelection | null;
	/** A returned promise that rejects puts the trigger back to the saved choice. */
	onChange: (selection: AiModelSelection) => unknown;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const query = api.agent.useGetModels({
		agentKey: () => props.agentKey,
		routineId: () => props.routineId,
	});

	const [open, setOpen] = createSignal(false);
	//* choices made while open are kept here and saved on close, so the chat's model changes once
	const [draft, setDraft] = createSignal<AiModelSelection>();
	//* shown on the trigger until the saved value arrives, so it does not flick back while saving
	const [committed, setCommitted] = createSignal<AiModelSelection>();

	// ----------------------------------------
	// Memos
	const catalog = createMemo(() =>
		query.isSuccess ? query.data.data : undefined,
	);
	const saved = createMemo(() =>
		resolve(committed() ?? props.value ?? catalog()?.default),
	);
	const shown = createMemo(() => {
		const current = draft();
		return current ? resolve(current) : saved();
	});
	//* only the first load, so background refreshes do not show a spinner
	const loading = createMemo(() => query.isFetching && !query.isSuccess);
	const efforts = createMemo(() => shown().model?.reasoningEfforts ?? []);
	const effortIndex = createMemo(() => {
		const current = shown().effort;
		return current ? Math.max(efforts().indexOf(current), 0) : 0;
	});

	// ----------------------------------------
	// Functions
	function resolve(selection?: AiModelSelection | null) {
		const model = catalog()?.models.find(
			(model) => model.id === selection?.modelId,
		);
		return {
			model,
			effort: model ? effortFor(model, selection?.reasoningEffort) : null,
		};
	}
	const commit = () => {
		const next = draft();
		setDraft(undefined);
		if (!next) return;
		const current = saved();
		if (
			next.modelId !== current.model?.id ||
			next.reasoningEffort !== current.effort
		) {
			setCommitted(next);
			void Promise.resolve(props.onChange(next)).catch(() =>
				setCommitted(undefined),
			);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.value,
			() => setCommitted(undefined),
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<ModelPicker
			name="agent-model"
			class="me-1"
			models={catalog()?.models}
			value={shown().model?.id}
			triggerValue={saved().model?.id}
			onSelect={(modelId) => {
				const option = catalog()?.models.find((model) => model.id === modelId);
				if (option) setDraft(selectModel(option, shown().effort));
			}}
			open={open()}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) commit();
			}}
			loading={loading()}
			error={query.isError}
			onRetry={() => void query.refetch()}
			disabled={props.disabled || query.isPending}
			triggerEnd={
				<Show when={saved().effort}>
					{(value) => (
						<span class="hidden shrink-0 opacity-60 @md/composer:inline">
							{T()(`agent.models.effort.${value()}`)}
						</span>
					)}
				</Show>
			}
			notice={
				<Show when={props.value && !saved().model}>
					<p class="px-2 pt-1 pb-1.5 text-xs text-warning">
						{T()("agent.models.removed")}
					</p>
				</Show>
			}
			footer={
				<Show when={efforts().length ? shown().model : undefined}>
					{(current) => (
						<div class="shrink-0 border-t border-border px-3.5 pt-2.5 pb-3.5">
							<KobalteSlider.Root
								value={[effortIndex()]}
								minValue={0}
								maxValue={Math.max(efforts().length - 1, 1)}
								step={1}
								disabled={efforts().length < 2}
								getValueLabel={() =>
									T()(`agent.models.effort.${efforts()[effortIndex()]}`)
								}
								onChange={([index]) => {
									const next = efforts()[index ?? 0];
									if (next && next !== shown().effort) {
										setDraft({
											modelId: current().id,
											reasoningEffort: next,
										});
									}
								}}
							>
								<div class="mb-2.5 flex items-center justify-between text-xs">
									<KobalteSlider.Label class="font-medium text-muted">
										{T()("agent.models.effort")}
									</KobalteSlider.Label>
									<KobalteSlider.ValueLabel class="text-subtitle" />
								</div>
								{/* the track is inset by the thumb's radius, so the thumb stays inside the rail at each end */}
								<div class="relative h-6 rounded-full border border-border bg-input">
									<KobalteSlider.Track class="absolute inset-y-0 inset-x-3 cursor-pointer">
										{/* extends past the thumb's centre, so its rounded end stays hidden behind the thumb */}
										<KobalteSlider.Fill class="absolute inset-y-0 -mr-1.5 -ml-3 rounded-full bg-primary-medium transition-[right] duration-200 ease-out" />
										<For each={efforts()}>
											{(_, index) => (
												<span
													aria-hidden="true"
													class="pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted opacity-30"
													style={{
														left: `${(index() / Math.max(efforts().length - 1, 1)) * 100}%`,
													}}
												/>
											)}
										</For>
										<KobalteSlider.Thumb class="top-1/2 -mt-3 size-6 transition-[left] duration-200 ease-out rounded-full border border-border bg-title shadow-md outline-hidden focus-visible:ring-2 focus-visible:ring-primary">
											<KobalteSlider.Input />
										</KobalteSlider.Thumb>
									</KobalteSlider.Track>
								</div>
							</KobalteSlider.Root>
						</div>
					)}
				</Show>
			}
		/>
	);
};

export default AgentModelPicker;
