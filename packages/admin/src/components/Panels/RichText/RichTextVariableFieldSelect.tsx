import {
	FaSolidArrowLeft,
	FaSolidArrowUpRightFromSquare,
} from "solid-icons/fa";
import { type Component, For, Show } from "solid-js";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import Button from "@/components/Partials/Button";
import T from "@/translations";

export type RichTextVariableFieldOption = {
	key: string;
	label: string;
	value: string;
};

const RichTextVariableFieldSelect: Component<{
	targetLabel: string;
	viewTarget?: { label: string; href: string };
	fields: RichTextVariableFieldOption[];
	selectedFieldKey?: string;
	emptyLabel: string;
	onBack: () => void;
	onSelect: (fieldKey: string) => void;
	onConfirm: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<Button
						type="button"
						theme="secondary-subtle"
						size="icon-subtle"
						onClick={props.onBack}
						aria-label={T()("common.back")}
						title={T()("common.back")}
					>
						<FaSolidArrowLeft size={12} />
					</Button>
					<p class="truncate text-sm text-subtitle">{props.targetLabel}</p>
				</div>
				<Show when={props.viewTarget}>
					{(target) => (
						<a
							href={target().href}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary-base hover:text-primary-hover"
						>
							<span>{target().label}</span>
							<FaSolidArrowUpRightFromSquare size={10} />
						</a>
					)}
				</Show>
			</div>

			<div class="grid grow auto-rows-min grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
				<For each={props.fields}>
					{(field) => (
						<button
							type="button"
							class="min-h-16 rounded-md border border-border bg-card-base p-3 text-left transition-colors hover:border-primary-muted-border hover:bg-card-hover focus-visible:border-primary-base focus-visible:outline-2 focus-visible:outline-primary-base/30"
							classList={{
								"border-primary-base bg-primary-muted-bg ring-1 ring-primary-base/30":
									props.selectedFieldKey === field.key,
							}}
							aria-pressed={props.selectedFieldKey === field.key}
							onClick={() => props.onSelect(field.key)}
						>
							<p class="truncate text-sm font-medium text-title">
								{field.label}
							</p>
							<p class="mt-0.5 truncate text-xs text-subtitle">
								{field.value || T()("common.empty")}
							</p>
						</button>
					)}
				</For>
			</div>

			<Show when={props.fields.length === 0}>
				<p class="text-sm text-subtitle">{props.emptyLabel}</p>
			</Show>

			<PanelFooterActions
				selectedCount={props.selectedFieldKey ? 1 : 0}
				onClose={props.onClose}
				onConfirm={props.onConfirm}
				confirmDisabled={!props.selectedFieldKey}
				cancelLabel={T()("common.cancel")}
			/>
		</div>
	);
};

export default RichTextVariableFieldSelect;
