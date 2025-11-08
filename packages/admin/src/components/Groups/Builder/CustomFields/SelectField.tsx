import T from "@/translations";
import {
	type Component,
	createSignal,
	createMemo,
	batch,
	createEffect,
} from "solid-js";
import type { CFConfig, FieldResponse, FieldError } from "@types";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import { Select } from "@/components/Groups/Form";

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
	// State
	const [getValue, setValue] = createSignal<string | number | null>(null);

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
	// Effects
	createEffect(() => {
		setValue(fieldValue() || null);
	});

	// -------------------------------
	// Render
	return (
		<Select
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={getValue() || undefined}
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
				batch(() => {
					brickStore.get.setFieldValue({
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value || null,
						contentLocale: props.state.contentLocale,
					});
					setValue(value || null);
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
		/>
	);
};
