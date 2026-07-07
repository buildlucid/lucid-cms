import type { FieldError } from "@types";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	onMount,
	Show,
} from "solid-js";
import {
	DynamicField,
	TabField,
} from "@/components/Groups/Builder/CustomFields";
import { FieldRenderStateProvider } from "@/hooks/document/useFieldRenderState";
import brickStore, { type BrickData } from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import type {
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import { builderUiStateHelpers } from "@/utils/builder-ui-state-helpers";
import {
	evaluateFieldVisibility,
	type FieldConditionScope,
} from "@/utils/field-condition-helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";

interface BrickProps {
	state: {
		open: boolean;
		brick: BrickData;
		brickIndex: number;
		configFields: CollectionFieldConfig[];
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
	const configFields = createMemo(() => props.state.configFields || []);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const defaultLocale = createMemo(() =>
		getDefaultTranslationLocale(contentLocaleStore.get.locales),
	);
	const flattenedConfigFields = createMemo(() =>
		flattenStructuralScopeConfigs(configFields()),
	);
	const conditionScopes = createMemo<FieldConditionScope[]>(() => [
		{
			configFields: flattenedConfigFields(),
			fields: props.state.brick.fields,
		},
	]);
	const allTabs = createMemo(() =>
		configFields()
			.filter(
				(field): field is CollectionFieldConfigByType<"tab"> =>
					field.type === "tab",
			)
			.filter((field) => {
				if (!field.ui?.condition) return true;

				return evaluateFieldVisibility({
					fieldConfig: field,
					scopes: conditionScopes(),
					contentLocale: contentLocale(),
					defaultLocale: defaultLocale(),
				});
			}),
	);
	const contentLocales = createMemo(
		() => contentLocaleStore.get.locales.map((locale) => locale.code) || [],
	);
	const brickIndex = createMemo(() => props.state.brickIndex);
	const collectionKey = createMemo(() => props.state.collectionKey);
	const brickKey = createMemo(() => {
		if (props.state.brick.type === "collection-fields") return undefined;
		return props.state.brick.key;
	});
	const uiStateBrickKey = createMemo(() => props.state.brick.key);
	const brickOrder = createMemo(() => props.state.brick.order);
	const documentId = createMemo(() => props.state.documentId);
	const missingFieldColumns = createMemo(() => props.state.missingFieldColumns);
	const fieldsByKey = createMemo(() => {
		return new Map(props.state.brick.fields.map((field) => [field.key, field]));
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (configFields().length === 0) return;

		brickStore.get.ensureFields({
			brickIndex: brickIndex(),
			fieldConfig: configFields(),
			locales: contentLocales(),
		});
	});

	onMount(() => {
		builderUiStateHelpers.cleanupOldEntries();

		if (
			props.state.collectionKey &&
			props.state.documentId &&
			allTabs().length > 0
		) {
			const savedTab = builderUiStateHelpers.getActiveTab(
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

	//* select the first visible tab when the active tab is missing or hidden by a condition
	createEffect(() => {
		const tabs = allTabs();
		if (tabs.length === 0) return;
		const activeTab = getActiveTab();
		if (!activeTab || !tabs.some((tab) => tab.key === activeTab)) {
			setActiveTab(tabs[0]?.key);
		}
	});

	createEffect(() => {
		const activeTab = getActiveTab();
		if (activeTab && props.state.collectionKey && props.state.documentId) {
			builderUiStateHelpers.setActiveTab(
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
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: explanation
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
					"grid grid-cols-12 gap-4": allTabs().length === 0,
				})}
			>
				<FieldRenderStateProvider
					brickOrder={brickOrder}
					brickIndex={brickIndex}
					collectionKey={collectionKey}
					brickKey={brickKey}
					documentId={documentId}
					contentLocale={contentLocale}
					defaultLocale={defaultLocale}
					contentLocales={contentLocales}
					missingFieldColumns={missingFieldColumns}
					uiStateBrickKey={uiStateBrickKey}
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
										fieldErrors={props.state.fieldErrors}
									/>
								)}
							</Index>
						</div>
					</Show>
					{/* Body */}
					<Index each={configFields()}>
						{(config) => (
							<DynamicField
								state={{
									fields: props.state.brick.fields,
									fieldsByKey: fieldsByKey,
									fieldConfig: config(),
									activeTab: getActiveTab,
									fieldErrors: props.state.fieldErrors,
									conditionScopes: conditionScopes,
								}}
							/>
						)}
					</Index>
				</FieldRenderStateProvider>
			</div>
		</div>
	);
};
