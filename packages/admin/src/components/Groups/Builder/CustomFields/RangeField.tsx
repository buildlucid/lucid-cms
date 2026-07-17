import type { FieldError, InternalDocumentField } from "@types";
import { type Component, createMemo } from "solid-js";
import { Range } from "@/components/Groups/Form";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brick-store";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface RangeFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"range">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const RangeField: Component<RangeFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldValue = createMemo(() => {
		return (
			brickHelpers.getFieldValue<number[]>({
				fieldData: props.state.fieldData,
				fieldConfig: props.state.fieldConfig,
				contentLocale: fieldRenderState.contentLocale(),
			}) ?? props.state.fieldConfig.default
		);
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<Range
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: fieldRenderState.brickIndex(),
				groupRef: props.state.groupRef,
			})}
			name={props.state.fieldConfig.key}
			value={fieldValue() ?? []}
			onChange={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: fieldRenderState.brickIndex(),
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					value,
					contentLocale: fieldRenderState.contentLocale(),
				});
			}}
			min={props.state.fieldConfig.min}
			max={props.state.fieldConfig.max}
			step={props.state.fieldConfig.step}
			thumbs={props.state.fieldConfig.thumbs}
			copy={{
				label: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.label,
				}),
				describedBy: helpers.getLocaleValue({
					value: props.state.fieldConfig.details.summary,
				}),
			}}
			errors={props.state.fieldError}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={disabled()}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
