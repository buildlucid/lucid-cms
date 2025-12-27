import type { CFConfig, FieldError, FieldResponse } from "@types";
import { type Component, createMemo } from "solid-js";
import { WYSIWYG } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface WYSIWYGFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"wysiwyg">;
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

export const WYSIWYGField: Component<WYSIWYGFieldProps> = (props) => {
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
		<WYSIWYG
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
			disabled={isDisabled()}
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
		/>
	);
};
