import type { FieldError } from "@types";
import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	onMount,
	Show,
} from "solid-js";
import BrickSlots from "@/components/BrickSlots/BrickSlots";
import { DynamicField } from "@/components/DynamicField/DynamicField";
import { TabField } from "@/components/TabField/TabField";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { FieldRenderStateProvider } from "@/hooks/useFieldRenderState/useFieldRenderState";
import brickStore, { type BrickData } from "@/store/brickStore/brickStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import type {
	CollectionBrickConfig,
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import {
	evaluateFieldVisibility,
	type FieldConditionScope,
} from "@/utils/field-condition-helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";

interface BrickProps {
	brickConfig?: CollectionBrickConfig;
	id?: string;
	open: boolean;
	brick: BrickData;
	brickIndex: number;
	configFields: CollectionFieldConfig[];
	labelledby?: string;
	fieldErrors: FieldError[];
	missingFieldColumns: string[];
	collectionKey?: string;
	documentId?: number;
	contentLocale?: Accessor<string | undefined>;
	options: {
		padding?: "16" | "24";
		bleedTop?: boolean;
	};
}

export const BrickBody: Component<BrickProps> = (props) => {
	// -------------------------------
	// State
	const [getActiveTab, setActiveTab] = createSignal<string>();
	const [contentMounted, setContentMounted] = createSignal(props.open);
	const documentLocalization = useDocumentLocalization();

	// ----------------------------------
	// Memos
	const configFields = createMemo(() => props.configFields || []);
	const contentLocale = createMemo(
		() => props.contentLocale?.() ?? documentLocalization.contentLocale() ?? "",
	);
	const flattenedConfigFields = createMemo(() =>
		flattenStructuralScopeConfigs(configFields()),
	);
	const conditionScopes = createMemo<FieldConditionScope[]>(() => [
		{
			configFields: flattenedConfigFields(),
			fields: props.brick.fields,
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
					defaultLocale: documentLocalization.defaultLocale(),
				});
			}),
	);
	const brickIndex = createMemo(() => props.brickIndex);
	const collectionKey = createMemo(() => props.collectionKey);
	const brickKey = createMemo(() => {
		if (props.brick.type === "collection-fields") return undefined;
		return props.brick.key;
	});
	const brickRef = createMemo(() => props.brick.ref);
	const brickOrder = createMemo(() => props.brick.order);
	const documentId = createMemo(() => props.documentId);
	const uiPreferenceScope = createMemo(() => {
		const currentCollectionKey = collectionKey();
		const currentDocumentId = documentId();
		if (!currentCollectionKey || currentDocumentId === undefined) return null;

		return {
			brickRef: brickRef(),
			collectionKey: currentCollectionKey,
			documentId: currentDocumentId,
		};
	});
	const missingFieldColumns = createMemo(() => props.missingFieldColumns);
	const fieldsByKey = createMemo(() => {
		return new Map(props.brick.fields.map((field) => [field.key, field]));
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (props.open) setContentMounted(true);
	});

	createEffect(() => {
		if (configFields().length === 0) return;

		brickStore.get.ensureFields({
			brickIndex: brickIndex(),
			fieldConfig: configFields(),
			locales: documentLocalization.localeCodes(),
		});
	});

	onMount(() => {
		userPreferencesStore.cleanupBuilderEntries();

		const preferenceScope = uiPreferenceScope();
		if (preferenceScope && allTabs().length > 0) {
			const savedTab =
				userPreferencesStore.getBuilderActiveTab(preferenceScope);
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
		const preferenceScope = uiPreferenceScope();
		if (activeTab && preferenceScope) {
			userPreferencesStore.setBuilderActiveTab(preferenceScope, activeTab);
		}
	});

	// ----------------------------------
	// Render
	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: explanation
		<div
			id={props.id}
			class={classNames(
				"transform-gpu origin-top duration-200 transition-all",
				{
					"scale-y-100 h-auto opacity-100 visible": props.open,
					"scale-y-0 h-0 opacity-0 invisible overflow-hidden": !props.open,
				},
			)}
			aria-labelledby={props.labelledby}
		>
			<div
				class={classNames({
					"p-4 pt-0": props.options.padding === "16",
					"p-6": props.options.padding === "24",
					"pt-4!": props.options.bleedTop && allTabs().length > 0,
					"pt-0!": props.options.bleedTop && allTabs().length === 0,
				})}
			>
				<Show when={contentMounted()}>
					<FieldRenderStateProvider
						brickOrder={brickOrder}
						brickIndex={brickIndex}
						collectionKey={collectionKey}
						brickKey={brickKey}
						documentId={documentId}
						contentLocale={contentLocale}
						defaultLocale={documentLocalization.defaultLocale}
						contentLocales={documentLocalization.localeCodes}
						missingFieldColumns={missingFieldColumns}
						brickRef={brickRef}
					>
						<BrickSlots
							config={props.brickConfig}
							errors={props.fieldErrors}
							brick={props.brick}
							collectionKey={props.collectionKey}
							contentLocale={contentLocale()}
						>
							<div
								classList={{
									"@container/fields grid grid-cols-12 gap-4":
										allTabs().length === 0,
								}}
							>
								{/* Tabs */}
								<Show when={allTabs().length > 0}>
									<TabField
										tabs={allTabs()}
										setActiveTab={setActiveTab}
										getActiveTab={getActiveTab}
										fieldErrors={props.fieldErrors}
										class={classNames("mb-5 shadow-inner", {
											"-mt-4": props.options.bleedTop,
										})}
									/>
								</Show>
								{/* Body */}
								<Index each={configFields()}>
									{(config) => (
										<DynamicField
											fields={props.brick.fields}
											fieldsByKey={fieldsByKey}
											fieldConfig={config()}
											activeTab={getActiveTab}
											fieldErrors={props.fieldErrors}
											conditionScopes={conditionScopes}
										/>
									)}
								</Index>
							</div>
						</BrickSlots>
					</FieldRenderStateProvider>
				</Show>
			</div>
		</div>
	);
};
