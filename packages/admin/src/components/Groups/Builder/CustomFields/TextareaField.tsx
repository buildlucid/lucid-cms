import type { CFConfig, FieldError, FieldResponse } from "@types";
import { type Component, createMemo } from "solid-js";
import { Textarea } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface TextareaFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"textarea">;
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

export const TextareaField: Component<TextareaFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<string>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: props.state.contentLocale,
		});
	});
	const isDisabled = createMemo(
		() => props.state.fieldConfig.config.isDisabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<Textarea
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={fieldValue() ?? ""}
			onChange={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: props.state.brickIndex,
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					value: value,
					contentLocale: props.state.contentLocale,
				});
			}}
			name={props.state.fieldConfig.key}
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
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			disabled={isDisabled()}
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			hideOptionalText
		/>
	);
};
