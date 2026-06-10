import classnames from "classnames";
import { FaSolidMagicWandSparkles } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import { Select } from "@/components/Groups/Form/Select";
import T from "@/translations";

export type AiGenerationHistoryItem = {
	id: string;
	label: string;
	meta?: string;
};

type GenerationHistoryProps = {
	id: string;
	items: AiGenerationHistoryItem[];
	activeItemId?: string;
	onSelect: (_itemId: string) => void;
	ariaLabel?: string;
	disabled?: boolean;
	loading?: boolean;
	loadingLabel?: string;
	loadingMeta?: string;
};

export const GenerationHistory: Component<GenerationHistoryProps> = (props) => {
	// ----------------------------------
	// Memos
	const activeItemId = createMemo(
		() => props.activeItemId ?? props.items[0]?.id,
	);
	const selectOptions = createMemo(() =>
		props.items.map((item) => ({
			value: item.id,
			label: item.label,
		})),
	);

	// ----------------------------------
	// Render
	return (
		<>
			<div class="min-w-0 pt-4 md:hidden">
				<Select
					id={props.id}
					name={props.id}
					value={activeItemId()}
					onChange={(value) => {
						if (typeof value !== "string") return;
						props.onSelect(value);
					}}
					options={selectOptions()}
					noMargin
					noClear
					hideOptionalText
					ariaLabel={props.ariaLabel ?? T()("common.history")}
					disabled={props.disabled || props.loading}
				/>
			</div>
			<div class="hidden min-w-0 overflow-y-auto pr-1 md:block md:py-6">
				<div class="relative min-w-0">
					<span class="absolute top-3 bottom-3 left-3 w-px bg-border" />
					<div class="relative min-w-0 space-y-1">
						<For each={props.items}>
							{(item) => {
								const selected = createMemo(() => item.id === activeItemId());

								return (
									<button
										type="button"
										class={classnames(
											"relative flex min-w-0 w-full items-start gap-2 rounded-md px-1.5 py-2 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
											{
												"text-title": selected(),
												"text-body hover:text-title": !selected(),
											},
										)}
										aria-pressed={selected()}
										disabled={props.disabled}
										onClick={() => props.onSelect(item.id)}
									>
										<span
											class={classnames(
												"relative z-10 mt-1 flex h-4 min-w-4 items-center justify-center rounded-full border bg-background-base transition-colors duration-200",
												{
													"border-primary-base": selected(),
													"border-border": !selected(),
												},
											)}
										>
											<span
												class={classnames(
													"h-1.5 w-1.5 rounded-full transition-colors duration-200",
													{
														"bg-primary-base": selected(),
														"bg-icon-fade": !selected(),
													},
												)}
											/>
										</span>
										<span class="min-w-0">
											<span class="block min-w-0 truncate text-xs font-semibold">
												{item.label}
											</span>
											<Show when={item.meta}>
												{(meta) => (
													<span class="mt-0.5 block truncate text-[11px] leading-4 text-unfocused">
														{meta()}
													</span>
												)}
											</Show>
										</span>
									</button>
								);
							}}
						</For>
						<Show when={props.loading}>
							<div class="relative flex min-w-0 w-full items-start gap-2 rounded-md px-1.5 py-2 text-left text-body">
								<span
									class="ai-action-button__surface relative z-10 mt-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-background-base text-primary-base"
									data-loading="true"
									data-variant="subtle"
								>
									<FaSolidMagicWandSparkles size={8} aria-hidden="true" />
								</span>
								<span class="min-w-0">
									<span class="block truncate text-xs font-semibold text-title">
										{props.loadingLabel ?? T()("common.loading")}
									</span>
									<Show when={props.loadingMeta}>
										{(meta) => (
											<span class="mt-0.5 block truncate text-[11px] leading-4 text-unfocused">
												{meta()}
											</span>
										)}
									</Show>
								</span>
							</div>
						</Show>
					</div>
				</div>
			</div>
		</>
	);
};

export default GenerationHistory;
