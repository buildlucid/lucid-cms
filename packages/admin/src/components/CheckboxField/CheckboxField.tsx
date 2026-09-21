import type { FieldError, InternalDocumentField } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import Field from "@/components/Field/Field";
import { FieldLabelMarkers } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import brickStore from "@/store/brickStore/brickStore";
import T from "@/translations";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface CheckboxFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"checkbox">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const CheckboxField: Component<CheckboxFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<boolean>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.ui?.disabled || brickStore.get.locked,
	);
	const id = createMemo(() =>
		brickHelpers.customFieldId({
			key: props.state.fieldConfig.key,
			brickIndex: fieldRenderState.brickIndex(),
			groupRef: props.state.groupRef,
		}),
	);
	const required = createMemo(
		() => props.state.fieldConfig.validation?.required || false,
	);
	const description = createMemo(() =>
		helpers.getLocaleValue({
			value: props.state.fieldConfig.details.description,
		}),
	);
	/**
	 * The field name sits above, so the box names the state it is in. The
	 * collection can word both states itself, otherwise it reads True or False.
	 */
	const stateLabel = createMemo(() => {
		const copy = helpers.getLocaleValue({
			value: fieldValue()
				? props.state.fieldConfig.details.true
				: props.state.fieldConfig.details.false,
		});
		if (copy) return copy;
		return fieldValue() ? T()("common.true") : T()("common.false");
	});

	// -------------------------------
	// Render
	return (
		<Field.Root
			id={id()}
			required={required()}
			disabled={disabled()}
			errors={props.state.fieldError}
		>
			<Field.Label
				start={
					<FieldLabelMarkers
						altLocaleError={props.state.altLocaleError}
						localised={props.state.localised}
						fieldColumnIsMissing={props.state.fieldColumnIsMissing}
					/>
				}
			>
				{helpers.getLocaleValue({
					value: props.state.fieldConfig.details.label,
				})}
			</Field.Label>
			<Checkbox
				id={id()}
				name={props.state.fieldConfig.key}
				value={fieldValue() ?? false}
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
				label={stateLabel()}
				variant="button"
				required={required()}
				disabled={disabled()}
			/>
			<Field.Error />
			<Show when={description()}>
				{(value) => <Field.Description>{value()}</Field.Description>}
			</Show>
		</Field.Root>
	);
};
