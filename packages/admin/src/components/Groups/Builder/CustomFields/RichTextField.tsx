import type { RichTextJSON } from "@lucidcms/rich-text";
import type { CFConfig, FieldError, InternalDocumentField } from "@types";
import { type Component, createMemo } from "solid-js";
import { RichText } from "@/components/Groups/Form";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface RichTextFieldProps {
	state: {
		fieldConfig: CFConfig<"rich-text">;
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

export const RichTextField: Component<RichTextFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<RichTextJSON | null>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.config.disabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<RichText
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
					value: value,
					contentLocale: fieldRenderState.contentLocale(),
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
			disabled={disabled()}
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
