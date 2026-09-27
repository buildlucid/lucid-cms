import { Slider as KobalteSlider, Popover } from "@kobalte/core";
import type { AiModelSelection } from "@types";
import classnames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import { composerTriggerClasses } from "@/components/AgentComposer/AgentComposer";
import Button from "@/components/Button/Button";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
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

	//* choices made while open are kept here and saved on close, so the chat's model changes once
	const [draft, setDraft] = createSignal<AiModelSelection>();
	//* shown on the trigger until the saved value arrives, so it does not flick back while saving
	const [committed, setCommitted] = createSignal<AiModelSelection>();

	// ----------------------------------------
	// Memos
	const catalog = createMemo(() => query.data?.data);
	const saved = createMemo(() =>
		resolve(committed() ?? props.value ?? catalog()?.default),
	);
	const shown = createMemo(() => {
		const current = draft();
		return current ? resolve(current) : saved();
	});
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
		<Popover.Root
			placement="top-end"
			gutter={8}
			onOpenChange={(open) => {
				if (!open) commit();
			}}
		>
			<Popover.Trigger
				class={classnames(
					composerTriggerClasses,
					"mr-1 min-w-0 max-w-56 px-2 disabled:opacity-50",
				)}
				aria-label={T()("agent.models.label")}
				title={
					query.isError
						? T()("agent.models.unavailable")
						: T()("agent.models.label")
				}
				disabled={props.disabled || query.isPending}
			>
				<span class="truncate">
					{saved().model?.name ?? T()("agent.models.label")}
				</span>
				{/* opacity rather than a colour, so it follows the trigger's hover colour */}
				<Show when={saved().effort}>
					{(value) => (
						<span class="hidden shrink-0 opacity-60 sm:inline">
							{T()(`agent.models.effort.${value()}`)}
						</span>
					)}
				</Show>
				<FaSolidChevronDown size={9} class="shrink-0" />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					//* capped to the space Kobalte measures, so only the model list scrolls and reasoning stays in view
					class="z-60 flex w-72 max-w-[calc(100vw-2rem)] max-h-(--kb-popper-content-available-height) flex-col rounded-md border border-border bg-popover shadow-md animate-dropdown focus:outline-hidden"
					//* the panel takes focus rather than the first model, so Tab still moves through it without a stray focus ring
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						(event.currentTarget as HTMLElement | null)?.focus();
					}}
				>
					<Show when={query.isError}>
						<div class="flex shrink-0 items-center justify-between gap-3 p-3 text-sm text-body">
							{T()("agent.models.unavailable")}
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void query.refetch()}
							>
								{T()("agent.models.retry")}
							</Button>
						</div>
					</Show>
					<Show when={catalog()}>
						{(current) => (
							<div class="min-h-0 overflow-y-auto p-1.5 scrollbar">
								<Show when={props.value && !saved().model}>
									<p class="px-2 pt-1 pb-1.5 text-xs text-warning">
										{T()("agent.models.removed")}
									</p>
								</Show>
								<fieldset class="flex min-w-0 flex-col gap-0.5">
									<legend class="px-2 pt-1 pb-1.5 text-xs font-medium text-muted">
										{T()("agent.models.label")}
									</legend>
									<For each={current().models}>
										{(option) => (
											<div
												class={classnames(
													"flex items-center gap-2 rounded-md pr-1.5 transition-colors has-focus-visible:ring-1 has-focus-visible:ring-inset has-focus-visible:ring-primary",
													option.id === shown().model?.id
														? "bg-input text-title"
														: "text-body hover:bg-card-hover hover:text-subtitle",
												)}
											>
												<label class="min-w-0 grow cursor-pointer truncate px-2 py-1.5 text-sm">
													<input
														type="radio"
														name="agent-model"
														value={option.id}
														checked={option.id === shown().model?.id}
														class="sr-only"
														onChange={() =>
															setDraft(selectModel(option, shown().effort))
														}
													/>
													{option.name}
												</label>
												<FormTooltip
													copy={option.description}
													variant="ghost"
												/>
											</div>
										)}
									</For>
								</fieldset>
							</div>
						)}
					</Show>
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
										if (next && next !== shown().effort)
											setDraft({
												modelId: current().id,
												reasoningEffort: next,
											});
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
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default AgentModelPicker;
