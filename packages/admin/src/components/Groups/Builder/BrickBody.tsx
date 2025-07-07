import {
	type Component,
	For,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import type { CFConfig, FieldError, FieldTypes } from "@types";
import type { BrickData } from "@/store/brickStore";
import classNames from "classnames";
import {
	TabField,
	DynamicField,
} from "@/components/Groups/Builder/CustomFields";

interface BrickProps {
	state: {
		open: boolean;
		brick: BrickData;
		brickIndex: number;
		configFields: CFConfig<FieldTypes>[];
		labelledby?: string;
		fieldErrors: FieldError[];
		missingFieldColumns: string[];
	};
	options: {
		padding?: "15" | "20";
		bleedTop?: boolean;
	};
}

export const BrickBody: Component<BrickProps> = (props) => {
	// -------------------------------
	// State
	const [getActiveTab, setActiveTab] = createSignal<string>();

	// ----------------------------------
	// Memos
	const allTabs = createMemo(
		() =>
			props.state.configFields?.filter((field) => field.type === "tab") || [],
	);

	// -------------------------------
	// Effects
	onMount(() => {
		if (getActiveTab() === undefined) {
			setActiveTab(allTabs()[0]?.key);
		}
	});

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames(
				"transform-gpu origin-top duration-200 transition-all",
				{
					"scale-y-100 h-auto opacity-100 visible": props.state.open,
					"scale-y-0 h-0 opacity-0 invisible overflow-hidden":
						!props.state.open,
				},
			)}
			aria-labelledby={props.state.labelledby}
		>
			<div
				class={classNames({
					"p-15 pt-0": props.options.padding === "15",
					"p-5": props.options.padding === "20",
					"pt-15!": props.options.bleedTop,
				})}
			>
				{/* Tabs */}
				<Show when={allTabs().length > 0}>
					<div class="border-b border-border mb-6 flex flex-wrap">
						<For each={allTabs()}>
							{(tab) => (
								<TabField
									tab={tab}
									setActiveTab={setActiveTab}
									getActiveTab={getActiveTab}
								/>
							)}
						</For>
					</div>
				</Show>
				{/* Body */}
				<For each={props.state.configFields}>
					{(config) => (
						<DynamicField
							state={{
								fields: props.state.brick.fields,
								brickIndex: props.state.brickIndex,
								fieldConfig: config,
								activeTab: getActiveTab(),
								fieldErrors: props.state.fieldErrors,
								missingFieldColumns: props.state.missingFieldColumns,
							}}
						/>
					)}
				</For>
			</div>
		</div>
	);
};
