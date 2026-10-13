import { Popover } from "@kobalte/core";
import classnames from "classnames";
import {
	TbOutlineChevronDown,
	TbOutlineRotateClockwise2,
} from "solid-icons/tb";
import {
	type Component,
	createMemo,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import { composerTriggerClasses } from "@/components/ComposerTriggerLabel/classes";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

type ModelPickerOption = {
	id: string;
	name: string;
	description: string;
};

/** Shows a toolbar model picker with loading feedback and retry on errors. */
const ModelPicker: Component<{
	/** Groups the model radios, so each picker on a page needs its own. */
	name: string;
	models?: ModelPickerOption[];
	/** The model checked in the list. */
	value?: string;
	/** The trigger label's model, which may differ from the checked model while saving. */
	triggerValue?: string;
	onSelect: (_modelId: string) => void;
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	loading?: boolean;
	error?: boolean;
	onRetry?: () => void;
	disabled?: boolean;
	/** Shown on the trigger after the model name, such as a reasoning effort. */
	triggerEnd?: JSXElement;
	/** Shown above the list, such as a note that the saved model was removed. */
	notice?: JSXElement;
	/** Shown below the list, such as further settings for the checked model. */
	footer?: JSXElement;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const triggerName = createMemo(() => {
		const id = props.triggerValue ?? props.value;
		return props.models?.find((model) => model.id === id)?.name;
	});
	const triggerLabel = createMemo(() => {
		const name = triggerName();
		return name ? T()("ai.models.current", { name }) : T()("ai.models.label");
	});

	// ----------------------------------------
	// Render
	return (
		<Popover.Root
			placement="top-end"
			gutter={8}
			open={props.open}
			onOpenChange={(next) => {
				if (next && props.error) {
					props.onRetry?.();
					return;
				}
				props.onOpenChange(next);
			}}
		>
			<Popover.Trigger
				type="button"
				class={classnames(
					composerTriggerClasses,
					"min-w-0 max-w-56 px-2 disabled:opacity-50",
					props.class,
				)}
				aria-label={triggerLabel()}
				title={
					props.error && !props.loading
						? T()("ai.models.retry.hint")
						: triggerLabel()
				}
				disabled={props.disabled || props.loading}
			>
				<span class="truncate">{triggerName() ?? T()("ai.models.label")}</span>
				{props.triggerEnd}
				<Switch fallback={<TbOutlineChevronDown size={9} class="shrink-0" />}>
					<Match when={props.loading}>
						<Spinner size="sm" class="shrink-0 [&_svg]:size-3" />
					</Match>
					<Match when={props.error}>
						<TbOutlineRotateClockwise2 size={9} class="shrink-0" />
					</Match>
				</Switch>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					//* capped to the space Kobalte measures, so only the model list scrolls and the footer stays in view
					class="z-70 flex w-72 max-w-[calc(100vw-2rem)] max-h-(--kb-popper-content-available-height) flex-col rounded-md border border-border bg-popover shadow-md animate-dropdown focus:outline-hidden"
					//* the panel takes focus rather than the first model, so Tab still moves through it without a stray focus ring
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						(event.currentTarget as HTMLElement | null)?.focus();
					}}
				>
					<Show when={props.models}>
						{(models) => (
							<div class="min-h-0 overflow-y-auto p-1.5 scrollbar">
								{props.notice}
								<fieldset class="flex min-w-0 flex-col gap-0.5">
									<legend class="px-2 pt-1 pb-1.5 text-xs font-medium text-muted">
										{T()("ai.models.label")}
									</legend>
									<For each={models()}>
										{(option) => (
											<div
												class={classnames(
													"flex items-center gap-2 rounded-md pe-1.5 transition-colors has-focus-visible:ring-1 has-focus-visible:ring-inset has-focus-visible:ring-primary",
													option.id === props.value
														? "bg-input text-title"
														: "text-body hover:bg-card-hover hover:text-subtitle",
												)}
											>
												<label class="min-w-0 grow cursor-pointer truncate px-2 py-1.5 text-sm">
													<input
														type="radio"
														name={props.name}
														value={option.id}
														checked={option.id === props.value}
														class="sr-only"
														onChange={() => props.onSelect(option.id)}
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
					{props.footer}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};

export default ModelPicker;
