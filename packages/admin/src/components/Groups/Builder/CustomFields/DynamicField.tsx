import {
	InputField,
	RepeaterField,
	WYSIWYGField,
	UserField,
	DocumentField,
	CheckboxField,
	ColorField,
	JSONField,
	LinkField,
	MediaField,
	SelectField,
	TextareaField,
} from "@/components/Groups/Builder/CustomFields";
import FieldTypeIcon from "@/components/Partials/FieldTypeIcon";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import type { CFConfig, FieldError, FieldResponse, FieldTypes } from "@types";
import classNames from "classnames";
import {
	type Component,
	Index,
	Match,
	Show,
	Switch,
	createMemo,
} from "solid-js";

interface DynamicFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<FieldTypes>;
		fields: FieldResponse[];
		fieldErrors: FieldError[];
		activeTab?: string;
		missingFieldColumns: string[];

		groupRef?: string;
		repeaterKey?: string;
		repeaterDepth?: number;
	};
}

export const DynamicField: Component<DynamicFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const fieldConfig = createMemo(() => props.state.fieldConfig);
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const fieldData = createMemo(() => {
		if (props.state.fieldConfig.type === "tab") return;

		const field = props.state.fields?.find(
			(f) => f.key === props.state.fieldConfig.key,
		);

		if (!field) {
			return brickStore.get.addField({
				brickIndex: props.state.brickIndex,
				fieldConfig: props.state.fieldConfig,
				ref: props.state.groupRef,
				repeaterKey: props.state.repeaterKey,
				locales: locales().map((l) => l.code),
			});
		}
		return field;
	});
	const fieldError = createMemo(() => {
		//* repeaters dont incldue a localeCode
		//* if the field or collection doesnt support translations
		if (
			props.state.fieldConfig.type === "repeater" ||
			// @ts-expect-error
			fieldConfig()?.config?.useTranslations !== true ||
			brickStore.get.collectionTranslations !== true
		) {
			return props.state.fieldErrors.find(
				(f) => f.key === props.state.fieldConfig.key,
			);
		}

		return props.state.fieldErrors.find(
			(f) =>
				f.key === props.state.fieldConfig.key &&
				f.localeCode === contentLocale(),
		);
	});
	const isLocalised = createMemo(() => {
		return (
			// @ts-expect-error
			props.state.fieldConfig?.config?.useTranslations &&
			brickStore.get.collectionTranslations
		);
	});
	const altLocaleError = createMemo(() => {
		return props.state.fieldErrors.some(
			(f) =>
				f.key === props.state.fieldConfig.key &&
				f.localeCode &&
				f.localeCode !== contentLocale(),
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
		return props.state.missingFieldColumns.includes(fieldConfig().key);
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
							fieldConfig()?.config?.isHidden === true
						: false,
			})}
		>
			<Show when={fieldConfig().type !== "tab"}>
				<FieldTypeIcon type={fieldConfig().type} />
			</Show>
			<div
				class={classNames("w-full h-full", {
					"pl-[38px]": fieldConfig().type !== "tab",
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
							<Index each={(fieldConfig() as CFConfig<"tab">).fields}>
								{(config) => (
									<DynamicField
										state={{
											brickIndex: props.state.brickIndex,
											fieldConfig: config(),
											fields: props.state.fields,
											activeTab: props.state.activeTab,
											groupRef: props.state.groupRef,
											repeaterKey: props.state.repeaterKey,
											repeaterDepth: props.state.repeaterDepth,
											fieldErrors: props.state.fieldErrors,
											missingFieldColumns: props.state.missingFieldColumns,
										}}
									/>
								)}
							</Index>
						</div>
					</Match>
					<Match when={fieldConfig().type === "repeater"}>
						<RepeaterField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"repeater">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								parentRepeaterKey: props.state.repeaterKey,
								repeaterDepth: props.state.repeaterDepth ?? 0,
								fieldError: fieldError(),
								missingFieldColumns: props.state.missingFieldColumns,
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "text"}>
						<InputField
							type="text"
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"text">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"user">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
								localised: isLocalised(),
								fieldColumnIsMissing: fieldColumnIsMissing(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "document"}>
						<DocumentField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"document">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"number">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
								localised: isLocalised(),
								fieldColumnIsMissing: fieldColumnIsMissing(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "datetime"}>
						<InputField
							type="datetime-local"
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"datetime">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"checkbox">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"color">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"json">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"link">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"media">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
								localised: isLocalised(),
								fieldColumnIsMissing: fieldColumnIsMissing(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "select"}>
						<SelectField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"select">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"textarea">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
								localised: isLocalised(),
								fieldColumnIsMissing: fieldColumnIsMissing(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "wysiwyg"}>
						<WYSIWYGField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"wysiwyg">,
								fieldData: fieldData(),
								groupRef: props.state.groupRef,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
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
