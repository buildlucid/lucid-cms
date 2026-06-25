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
	ColorField,
	DocumentField,
	InputField,
	JSONField,
	LinkField,
	MediaField,
	RepeaterField,
	RichTextField,
	SelectField,
	TextareaField,
	UserField,
} from "@/components/Groups/Builder/CustomFields";
import FieldTypeIcon from "@/components/Partials/FieldTypeIcon";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type {
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";

interface DynamicFieldProps {
	state: {
		fieldConfig: CollectionFieldConfig;
		fields: InternalDocumentField[];
		fieldErrors: FieldError[];
		activeTab?: string;

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
	const hasMultipleLocales = createMemo(
		() => fieldRenderState.contentLocales().length > 1,
	);
	const fieldData = createMemo(() => {
		if (props.state.fieldConfig.type === "tab") return;

		const field = props.state.fields?.find(
			(f) => f.key === props.state.fieldConfig.key,
		);

		if (!field) {
			return brickStore.get.addField({
				brickIndex: fieldRenderState.brickIndex(),
				fieldConfig: props.state.fieldConfig,
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
	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full relative", {
				"mb-0!": !activeTab(),
				"invisible h-0 opacity-0 mb-0!":
					fieldConfig().type !== "tab"
						? // @ts-expect-error
							fieldConfig()?.ui?.hidden === true
						: false,
			})}
		>
			<Show when={fieldConfig().type !== "tab"}>
				<FieldTypeIcon type={fieldConfig().type} />
			</Show>
			<div
				class={classNames("w-full h-full", {
					"pl-9.5": fieldConfig().type !== "tab",
				})}
			>
				<Switch>
					<Match when={fieldConfig().type === "tab"}>
						<div
							class={classNames(
								"transition-opacity duration-200 ease-in-out flex flex-col gap-4",
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
	);
};
