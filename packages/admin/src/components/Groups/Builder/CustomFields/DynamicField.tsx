import type { FieldError, InternalDocumentField } from "@types";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	Index,
	Match,
	Show,
	Switch,
} from "solid-js";
import {
	CheckboxField,
	CodeField,
	CollapsibleField,
	ColorField,
	DocumentField,
	InputField,
	JSONField,
	LinkField,
	MediaField,
	RepeaterField,
	RichTextField,
	SectionField,
	SelectField,
	TextareaField,
	UserField,
} from "@/components/Groups/Builder/CustomFields";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import {
	evaluateFieldVisibility,
	type FieldConditionScope,
} from "@/utils/field-condition-helpers";

/** Maps `ui.width` onto the 12-column grid. Mobile always spans the full row. */
const fieldWidthClasses: Record<number, string> = {
	12: "col-span-12",
	8: "col-span-12 md:col-span-8",
	6: "col-span-12 md:col-span-6",
	4: "col-span-12 md:col-span-4",
	3: "col-span-12 md:col-span-3",
};

interface DynamicFieldProps {
	state: {
		fieldConfig: CollectionFieldConfig;
		fields: InternalDocumentField[];
		fieldErrors: FieldError[];
		activeTab?: string;
		conditionScopes?: FieldConditionScope[];

		groupRef?: string;
		groupPath?: string;
		repeaterKey?: string;
		repeaterDepth?: number;
	};
}

export const DynamicField: Component<DynamicFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldConfig = createMemo(() => props.state.fieldConfig);
	const conditionScopes = createMemo(() => props.state.conditionScopes ?? []);
	const conditionVisible = createMemo(() =>
		evaluateFieldVisibility({
			fieldConfig: fieldConfig(),
			scopes: conditionScopes(),
			contentLocale: fieldRenderState.contentLocale(),
			defaultLocale: fieldRenderState.defaultLocale(),
		}),
	);
	const hasMultipleLocales = createMemo(
		() => fieldRenderState.contentLocales().length > 1,
	);
	const fieldData = createMemo(() => {
		if (
			props.state.fieldConfig.type === "tab" ||
			props.state.fieldConfig.type === "section" ||
			props.state.fieldConfig.type === "collapsible"
		) {
			return;
		}

		const field = props.state.fields?.find(
			(f) => f.key === props.state.fieldConfig.key,
		);

		if (!field) {
			return brickStore.get.addField({
				brickIndex: fieldRenderState.brickIndex(),
				fieldConfig: props.state.fieldConfig as CollectionDataFieldConfig,
				ref: props.state.groupRef,
				repeaterKey: props.state.repeaterKey,
				locales: fieldRenderState.contentLocales(),
			});
		}
		return field;
	});
	const fieldErrors = createMemo(() => {
		//* repeaters dont incldue a localeCode
		//* if the field or collection doesnt support localization
		if (
			props.state.fieldConfig.type === "repeater" ||
			// @ts-expect-error
			fieldConfig()?.localized !== true ||
			brickStore.get.collectionLocalized !== true
		) {
			return props.state.fieldErrors.filter(
				(f) => f.key === props.state.fieldConfig.key,
			);
		}

		return props.state.fieldErrors.filter(
			(f) =>
				f.key === props.state.fieldConfig.key &&
				f.localeCode === fieldRenderState.contentLocale(),
		);
	});
	const fieldError = createMemo(() => fieldErrors()[0]);
	const isLocalised = createMemo(() => {
		return (
			hasMultipleLocales() &&
			// @ts-expect-error
			props.state.fieldConfig?.localized &&
			brickStore.get.collectionLocalized
		);
	});
	const altLocaleError = createMemo(() => {
		return props.state.fieldErrors.some(
			(f) =>
				f.key === props.state.fieldConfig.key &&
				f.localeCode &&
				f.localeCode !== fieldRenderState.contentLocale(),
		);
	});
	const activeTab = createMemo(() => {
		if (fieldConfig().type !== "tab") return true;
		return (
			fieldConfig().type === "tab" &&
			props.state.activeTab === fieldConfig().key
		);
	});
	const fieldColumnIsMissing = createMemo(() => {
		return fieldRenderState.missingFieldColumns().includes(fieldConfig().key);
	});
	const widthClass = createMemo(() => {
		if (fieldConfig().type === "tab") return fieldWidthClasses[12];

		// @ts-expect-error - not every field config type includes ui.width
		const width = fieldConfig()?.ui?.width as number | undefined;
		return fieldWidthClasses[width ?? 12] ?? fieldWidthClasses[12];
	});
	const wrapperSpacingClass = createMemo(() => {
		if (
			fieldConfig().type === "section" ||
			fieldConfig().type === "collapsible"
		) {
			return "my-2 last:mb-0";
		}

		return "";
	});
	// -------------------------------
	// Render
	return (
		<Show when={conditionVisible()}>
			<div
				class={classNames(
					"w-full relative",
					widthClass(),
					wrapperSpacingClass(),
					{
						"mb-0!": !activeTab(),
						"invisible h-0 opacity-0 mb-0!":
							fieldConfig().type !== "tab"
								? // @ts-expect-error
									fieldConfig()?.ui?.hidden === true
								: false,
					},
				)}
			>
				<div class="w-full h-full">
					<Switch>
						<Match when={fieldConfig().type === "tab"}>
							<div
								class={classNames(
									"transition-opacity duration-200 ease-in-out grid grid-cols-12 gap-4",
									{
										"visible h-full opacity-100": activeTab(),
										"invisible h-0 opacity-0": !activeTab(),
									},
								)}
							>
								<Index
									each={
										(fieldConfig() as CollectionFieldConfigByType<"tab">).fields
									}
								>
									{(config) => (
										<DynamicField
											state={{
												fieldConfig: config(),
												fields: props.state.fields,
												activeTab: props.state.activeTab,
												conditionScopes: props.state.conditionScopes,
												groupRef: props.state.groupRef,
												groupPath: props.state.groupPath,
												repeaterKey: props.state.repeaterKey,
												repeaterDepth: props.state.repeaterDepth,
												fieldErrors: props.state.fieldErrors,
											}}
										/>
									)}
								</Index>
							</div>
						</Match>
						<Match when={fieldConfig().type === "section"}>
							<SectionField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"section">,
									fields: props.state.fields,
									fieldErrors: props.state.fieldErrors,
									conditionScopes: props.state.conditionScopes,
									groupRef: props.state.groupRef,
									groupPath: props.state.groupPath,
									repeaterKey: props.state.repeaterKey,
									repeaterDepth: props.state.repeaterDepth,
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "collapsible"}>
							<CollapsibleField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"collapsible">,
									fields: props.state.fields,
									fieldErrors: props.state.fieldErrors,
									conditionScopes: props.state.conditionScopes,
									groupRef: props.state.groupRef,
									groupPath: props.state.groupPath,
									repeaterKey: props.state.repeaterKey,
									repeaterDepth: props.state.repeaterDepth,
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "repeater"}>
							<RepeaterField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"repeater">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									groupPath: props.state.groupPath,
									parentRepeaterKey: props.state.repeaterKey,
									repeaterDepth: props.state.repeaterDepth ?? 0,
									fieldError: fieldError(),
									conditionScopes: props.state.conditionScopes,
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "text"}>
							<InputField
								type="text"
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"text">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "user"}>
							<UserField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"user">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									fieldErrors: fieldErrors(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "document"}>
							<DocumentField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"document">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									fieldErrors: fieldErrors(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "number"}>
							<InputField
								type="number"
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"number">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "datetime"}>
							<InputField
								type={
									(fieldConfig() as CollectionFieldConfigByType<"datetime">)
										.time === false
										? "date"
										: "datetime-local"
								}
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"datetime">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "checkbox"}>
							<CheckboxField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"checkbox">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "color"}>
							<ColorField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"color">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "json"}>
							<JSONField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"json">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "code"}>
							<CodeField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"code">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "link"}>
							<LinkField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"link">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "media"}>
							<MediaField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"media">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									fieldErrors: fieldErrors(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "select"}>
							<SelectField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"select">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "textarea"}>
							<TextareaField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"textarea">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
						<Match when={fieldConfig().type === "rich-text"}>
							<RichTextField
								state={{
									fieldConfig:
										fieldConfig() as CollectionFieldConfigByType<"rich-text">,
									fieldData: fieldData(),
									groupRef: props.state.groupRef,
									repeaterKey: props.state.repeaterKey,
									fieldError: fieldError(),
									altLocaleError: altLocaleError(),
									localised: isLocalised(),
									fieldColumnIsMissing: fieldColumnIsMissing(),
								}}
							/>
						</Match>
					</Switch>
				</div>
			</div>
		</Show>
	);
};
