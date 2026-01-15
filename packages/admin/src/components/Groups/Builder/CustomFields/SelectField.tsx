import type { CFConfig, FieldError, FieldResponse } from "@types";
import { type Component, createMemo } from "solid-js";
import { Select } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface SelectFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"select">;
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

export const SelectField: Component<SelectFieldProps> = (props) => {
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
		<Select
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={fieldValue() ?? undefined}
			options={
				props.state.fieldConfig.options.map((o, i) => {
					return {
						label: helpers.getLocaleValue({
							value: o.label,
							fallback: T()("option_label", {
								count: i,
							}),
						}),
						value: o.value,
					};
				}) || []
			}
			onChange={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: props.state.brickIndex,
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					// store uses null, Select uses undefined for "clear"
					value: value === undefined ? null : value,
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
			}}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			noClear={props.state.fieldConfig.validation?.required || false}
			disabled={isDisabled()}
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
