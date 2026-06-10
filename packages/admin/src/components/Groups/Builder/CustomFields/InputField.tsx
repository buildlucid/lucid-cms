import type { FieldError, InternalDocumentField } from "@types";
import { type Component, createMemo } from "solid-js";
import { Input } from "@/components/Groups/Form";
import useCustomFieldGeneration from "@/hooks/ai/useCustomFieldGeneration";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface InputFieldProps {
	type: "number" | "text" | "date" | "datetime-local";
	state: {
		fieldConfig: CollectionFieldConfigByType<"text" | "number" | "datetime">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		focusKey: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const InputField: Component<InputFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const customFieldGeneration = useCustomFieldGeneration();
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		const value = brickHelpers.getFieldValue<string | number>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});

		if (typeof value === "number") {
			return value.toString();
		}

		if (typeof value !== "string") {
			return "";
		}

		if (props.type === "date") {
			return toDateInputValue(value);
		}
		if (props.type === "datetime-local") {
			return toDateTimeInputValue(value);
		}

		return value;
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.config.disabled || brickStore.get.locked,
	);
	const fieldAiConfig = createMemo(() => {
		if (props.type !== "text") return undefined;
		return (props.state.fieldConfig as CollectionFieldConfigByType<"text">).ai;
	});
	const aiGuidance = createMemo(
		() =>
			fieldAiConfig()?.guidance?.map((item) => ({
				key: item.key,
				label: helpers.getLocaleValue({
					value: item.label,
					fallback: item.key,
				}),
			})) ?? [],
	);

	const AiGenerationButton = customFieldGeneration.createActionButton({
		field: () => ({
			key: props.state.fieldConfig.key,
			type: "text" as const,
			label: helpers.getLocaleValue({
				value: props.state.fieldConfig.details.label,
				fallback: props.state.fieldConfig.key,
			}),
			localized: props.state.localised,
			guidance: aiGuidance(),
		}),
		request: () => ({
			collectionKey: fieldRenderState.collectionKey(),
			brickKey: fieldRenderState.brickKey(),
			fieldKey: props.state.fieldConfig.key,
			locale: {
				source: fieldRenderState.contentLocale() || undefined,
				target: fieldRenderState.contentLocale()
					? [fieldRenderState.contentLocale()]
					: [],
			},
		}),
		value: (localeCode?: string) =>
			brickHelpers.getFieldValue<string | number>({
				fieldData: fieldData(),
				fieldConfig: props.state.fieldConfig,
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			}),
		document: () => ({
			fields: brickHelpers.getCollectionPseudoBrickFields(),
			bricks: brickHelpers.getUpsertBricks(),
		}),
		setValue: (value: unknown, localeCode?: string) => {
			brickStore.get.setFieldValue({
				brickIndex: fieldRenderState.brickIndex(),
				fieldConfig: props.state
					.fieldConfig as CollectionFieldConfigByType<"text">,
				key: props.state.fieldConfig.key,
				ref: props.state.groupRef,
				repeaterKey: props.state.repeaterKey,
				value: typeof value === "string" ? value : String(value ?? ""),
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			});
		},
		disabled,
	});

	// -------------------------------
	// Render
	return (
		<Input
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: fieldRenderState.brickIndex(),
				groupRef: props.state.groupRef,
			})}
			focusKey={props.state.focusKey}
			value={fieldValue()}
			onChange={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: fieldRenderState.brickIndex(),
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					value: props.type === "number" ? Number(value) : value,
					contentLocale: fieldRenderState.contentLocale(),
				});
			}}
			name={props.state.fieldConfig.key}
			type={props.type}
			copy={{
				label: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.label,
				}),
				describedBy: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.summary,
				}),
				placeholder: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.placeholder,
				}),
			}}
			errors={props.state.fieldError}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={disabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			labelRightSlot={
				fieldAiConfig()?.enabled === true ? <AiGenerationButton /> : undefined
			}
			hideOptionalText
		/>
	);
};

const toDateInputValue = (value: string) => {
	if (!value) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";

	return parsed.toISOString().slice(0, 10);
};

const toDateTimeInputValue = (value: string) => {
	if (!value) return "";
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/.test(value)) return value.slice(0, 16);

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";

	const year = parsed.getFullYear();
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	const day = String(parsed.getDate()).padStart(2, "0");
	const hours = String(parsed.getHours()).padStart(2, "0");
	const minutes = String(parsed.getMinutes()).padStart(2, "0");

	return `${year}-${month}-${day}T${hours}:${minutes}`;
};
