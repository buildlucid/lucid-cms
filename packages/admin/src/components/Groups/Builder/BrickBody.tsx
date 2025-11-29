import {
	type Component,
	createMemo,
	createSignal,
	onMount,
	Show,
	createEffect,
	Index,
} from "solid-js";
import type { CFConfig, FieldError, FieldTypes } from "@types";
import type { BrickData } from "@/store/brickStore";
import classNames from "classnames";
import {
	TabField,
	DynamicField,
} from "@/components/Groups/Builder/CustomFields";
import { tabStateHelpers } from "@/utils/tab-state-helpers";

interface BrickProps {
	state: {
		open: boolean;
		brick: BrickData;
		brickIndex: number;
		configFields: CFConfig<FieldTypes>[];
		labelledby?: string;
		fieldErrors: FieldError[];
		missingFieldColumns: string[];
		collectionKey?: string;
		documentId?: number;
	};
	options: {
		padding?: "16" | "24";
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

	// ----------------------------------
	// Effects
	onMount(() => {
		tabStateHelpers.cleanupOldEntries();

		if (
			props.state.collectionKey &&
			props.state.documentId &&
			allTabs().length > 0
		) {
			const savedTab = tabStateHelpers.getTabState(
				props.state.collectionKey,
				props.state.documentId,
				props.state.brick.key,
				props.state.brick.order,
			);
			const tabExists = allTabs().some((tab) => tab.key === savedTab);

			if (savedTab && tabExists) {
				setActiveTab(savedTab);
			} else {
				const firstTab = allTabs()[0]?.key;
				if (firstTab) setActiveTab(firstTab);
			}
		} else if (getActiveTab() === undefined) {
			const firstTab = allTabs()[0]?.key;
			if (firstTab) setActiveTab(firstTab);
		}
	});

	createEffect(() => {
		const activeTab = getActiveTab();
		if (activeTab && props.state.collectionKey && props.state.documentId) {
			tabStateHelpers.setTabState(
				props.state.collectionKey,
				props.state.documentId,
				props.state.brick.key,
				props.state.brick.order,
				activeTab,
			);
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
					"p-4 pt-0": props.options.padding === "16",
					"p-6": props.options.padding === "24",
					"pt-4!": props.options.bleedTop && allTabs().length > 0,
					"flex flex-col gap-4": allTabs().length === 0,
				})}
			>
				{/* Tabs */}
				<Show when={allTabs().length > 0}>
					<div class="border-b border-border mb-6 flex flex-wrap">
						<Index each={allTabs()}>
							{(tab) => (
								<TabField
									tab={tab()}
									setActiveTab={setActiveTab}
									getActiveTab={getActiveTab}
								/>
							)}
						</Index>
					</div>
				</Show>
				{/* Body */}
				<Index each={props.state.configFields}>
					{(config) => (
						<DynamicField
							state={{
								fields: props.state.brick.fields,
								brickIndex: props.state.brickIndex,
								fieldConfig: config(),
								activeTab: getActiveTab(),
								fieldErrors: props.state.fieldErrors,
								missingFieldColumns: props.state.missingFieldColumns,
							}}
						/>
					)}
				</Index>
			</div>
		</div>
	);
};
