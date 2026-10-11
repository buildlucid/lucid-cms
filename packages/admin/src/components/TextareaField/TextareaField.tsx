import type { FieldError, InternalDocumentField } from "@types";
import { type Component, createMemo } from "solid-js";
import { FieldLabelMarkers } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import Textarea from "@/components/Textarea/Textarea";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface TextareaFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"textarea">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const TextareaField: Component<TextareaFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<string>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<Textarea
			id={brickHelpers.customFieldId({
				scope: brickStore.idPrefix,
				key: props.state.fieldConfig.key,
				brickIndex: fieldRenderState.brickIndex(),
				groupRef: props.state.groupRef,
			})}
			value={fieldValue() ?? ""}
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
			name={props.state.fieldConfig.key}
			label={helpers.getLocaleValue({
				value: props.state.fieldConfig.details.label,
			})}
			description={helpers.getLocaleValue({
				value: props.state.fieldConfig.details.description,
			})}
			placeholder={helpers.getLocaleValue({
				value: props.state.fieldConfig.details.placeholder,
			})}
			disabled={disabled()}
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			labelStart={
				<FieldLabelMarkers
					altLocaleError={props.state.altLocaleError}
					localised={props.state.localised}
					fieldColumnIsMissing={props.state.fieldColumnIsMissing}
				/>
			}
		/>
	);
};
