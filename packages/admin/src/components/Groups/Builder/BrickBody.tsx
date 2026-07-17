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
import userPreferencesStore from "@/store/userPreferences";
import type {
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import {
	evaluateFieldVisibility,
	type FieldConditionScope,
} from "@/utils/field-condition-helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";

interface BrickProps {
	open: boolean;
	brick: BrickData;
	brickIndex: number;
	configFields: CollectionFieldConfig[];
	labelledby?: string;
	fieldErrors: FieldError[];
	missingFieldColumns: string[];
	collectionKey?: string;
	documentId?: number;
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
	const configFields = createMemo(() => props.configFields || []);
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
					defaultLocale: defaultLocale(),
				});
			}),
	);
	const contentLocales = createMemo(
		() => contentLocaleStore.get.locales.map((locale) => locale.code) || [],
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
		if (configFields().length === 0) return;

		brickStore.get.ensureFields({
			brickIndex: brickIndex(),
			fieldConfig: configFields(),
			locales: contentLocales(),
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
					brickRef={brickRef}
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
										fieldErrors={props.fieldErrors}
									/>
								)}
							</Index>
						</div>
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
				</FieldRenderStateProvider>
			</div>
		</div>
	);
};
