import type { CFConfig, FieldError, FieldResponse } from "@types";
import { type Component, createMemo } from "solid-js";
import { Input } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface InputFieldProps {
	type: "number" | "text" | "date" | "datetime-local";
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"text" | "number" | "datetime">;
		fieldData?: FieldResponse;
		groupRef?: string;
		repeaterKey?: string;
		contentLocale: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const InputField: Component<InputFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		const value = brickHelpers.getFieldValue<string | number>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: props.state.contentLocale,
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
	const isDisabled = createMemo(
		() => props.state.fieldConfig.config.isDisabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<Input
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={fieldValue()}
			onChange={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: props.state.brickIndex,
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					value: props.type === "number" ? Number(value) : value,
					contentLocale: props.state.contentLocale,
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
			disabled={isDisabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
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
