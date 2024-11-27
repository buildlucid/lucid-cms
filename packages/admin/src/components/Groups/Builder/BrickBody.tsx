import {
	type Component,
	For,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import type { CFConfig, FieldTypes } from "@lucidcms/core/types";
import type { BrickData } from "@/store/brickStore";
import classNames from "classnames";
import CustomFields from "@/components/Groups/Builder/CustomFields";

interface BrickProps {
	state: {
		open: boolean;
		brick: BrickData;
		brickIndex: number;
		configFields: CFConfig<FieldTypes>[];
		labelledby?: string;
	};
	options: {
		padding?: "15" | "30";
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
					"p-15 md:p-30": props.options.padding === "30",
					"pt-15!": props.options.bleedTop,
				})}
			>
				{/* Tabs */}
				<Show when={allTabs().length > 0}>
					<div class="border-b border-border mb-6 flex flex-wrap">
						<For each={allTabs()}>
							{(tab) => (
								<CustomFields.TabField
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
						<CustomFields.DynamicField
							state={{
								fields: props.state.brick.fields,
								brickIndex: props.state.brickIndex,
								fieldConfig: config,
								activeTab: getActiveTab(),
							}}
						/>
					)}
				</For>
			</div>
		</div>
	);
};
