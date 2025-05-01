import {
	type Component,
	createSignal,
	createEffect,
	batch,
	createMemo,
} from "solid-js";
import type { CFConfig, FieldResponse, FieldError } from "@types";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import { Colour } from "@/components/Groups/Form";

interface ColourFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"colour">;
		fieldData?: FieldResponse;
		groupRef?: string;
		repeaterKey?: string;
		contentLocale: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
	};
}

export const ColourField: Component<ColourFieldProps> = (props) => {
	// -------------------------------
	// State
	const [getValue, setValue] = createSignal("");

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
		setValue(fieldValue() || "");
	});

	// -------------------------------
	// Render
	return (
		<div>
			<Colour
				id={brickHelpers.customFieldId({
					key: props.state.fieldConfig.key,
					brickIndex: props.state.brickIndex,
					groupRef: props.state.groupRef,
				})}
				value={getValue()}
				onChange={(value) => {
					batch(() => {
						brickStore.get.setFieldValue({
							brickIndex: props.state.brickIndex,
							fieldConfig: props.state.fieldConfig,
							key: props.state.fieldConfig.key,
							ref: props.state.groupRef,
							repeaterKey: props.state.repeaterKey,
							value: value,
							contentLocale: props.state.contentLocale,
						});
						setValue(value);
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
				presets={props.state.fieldConfig.presets}
				disabled={isDisabled()}
				errors={props.state.fieldError}
				required={props.state.fieldConfig.validation?.required || false}
			/>
		</div>
	);
};
