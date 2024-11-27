import { type Component, Match, Switch, Show, createMemo, For } from "solid-js";
import classNames from "classnames";
import type { CFConfig, FieldResponse, FieldTypes } from "@lucidcms/core/types";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import CustomFields from "@/components/Groups/Builder/CustomFields";
import FieldTypeIcon from "@/components/Partials/FieldTypeIcon";

interface DynamicFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<FieldTypes>;
		fields: FieldResponse[];
		activeTab?: string;

		groupId?: number | string;
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
				groupId: props.state.groupId,
				repeaterKey: props.state.repeaterKey,
				locales: locales().map((l) => l.code),
			});
		}
		return field;
	});
	const brickId = createMemo(() => {
		return brickStore.get.bricks[props.state.brickIndex].id;
	});
	const fieldError = createMemo(() => {
		return brickStore.get.fieldsErrors.find((f) => {
			return (
				f.brickId === brickId() &&
				f.key === props.state.fieldConfig.key &&
				f.localeCode === contentLocale() &&
				f.groupId === props.state.groupId
			);
		});
	});
	const altLocaleError = createMemo(() => {
		return brickStore.get.fieldsErrors.some((f) => {
			return (
				f.brickId === brickId() &&
				f.key === props.state.fieldConfig.key &&
				f.localeCode !== contentLocale() &&
				f.groupId === props.state.groupId
			);
		});
	});
	const activeTab = createMemo(() => {
		if (fieldConfig().type !== "tab") return true;
		return (
			fieldConfig().type === "tab" &&
			props.state.activeTab === fieldConfig().key
		);
	});

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full mb-15 last:mb-0 relative", {
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
							class={classNames("transition-opacity duration-200 ease-in-out", {
								"visible h-full opacity-100": activeTab(),
								"invisible h-0 opacity-0": !activeTab(),
							})}
						>
							<For each={(fieldConfig() as CFConfig<"tab">).fields}>
								{(config) => (
									<DynamicField
										state={{
											brickIndex: props.state.brickIndex,
											fieldConfig: config,
											fields: props.state.fields,
											activeTab: props.state.activeTab,
											groupId: props.state.groupId,
											repeaterKey: props.state.repeaterKey,
											repeaterDepth: props.state.repeaterDepth,
										}}
									/>
								)}
							</For>
						</div>
					</Match>
					<Match when={fieldConfig().type === "repeater"}>
						<CustomFields.RepeaterField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"repeater">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								parentRepeaterKey: props.state.repeaterKey,
								repeaterDepth: props.state.repeaterDepth ?? 0,
							}}
						/>
					</Match>

					<Match when={fieldConfig().type === "text"}>
						<CustomFields.InputField
							type="text"
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"text">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "user"}>
						<CustomFields.UserField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"user">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "document"}>
						<CustomFields.DocumentField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"document">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "number"}>
						<CustomFields.InputField
							type="number"
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"number">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "datetime"}>
						<CustomFields.InputField
							type="datetime-local"
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"datetime">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "checkbox"}>
						<CustomFields.CheckboxField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"checkbox">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "colour"}>
						<CustomFields.ColourField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"colour">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "json"}>
						<CustomFields.JSONField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"json">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "link"}>
						<CustomFields.LinkField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"link">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "media"}>
						<CustomFields.MediaField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"media">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "select"}>
						<CustomFields.SelectField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"select">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "textarea"}>
						<CustomFields.TextareaField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"textarea">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
					<Match when={fieldConfig().type === "wysiwyg"}>
						<CustomFields.WYSIWYGField
							state={{
								brickIndex: props.state.brickIndex,
								fieldConfig: fieldConfig() as CFConfig<"wysiwyg">,
								fieldData: fieldData(),
								groupId: props.state.groupId,
								repeaterKey: props.state.repeaterKey,
								contentLocale: contentLocale(),
								fieldError: fieldError(),
								altLocaleError: altLocaleError(),
							}}
						/>
					</Match>
				</Switch>
			</div>
		</div>
	);
};
