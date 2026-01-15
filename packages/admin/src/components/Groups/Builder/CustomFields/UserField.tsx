import type { CFConfig, FieldError, FieldResponse } from "@types";
import { type Component, createMemo } from "solid-js";
import UserSearchSelect from "@/components/Partials/SearchSelects/UserSearchSelect";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface UserFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"user">;
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

export const UserField: Component<UserFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return (
			brickHelpers.getFieldValue<number>({
				fieldData: fieldData(),
				fieldConfig: props.state.fieldConfig,
				contentLocale: props.state.contentLocale,
			}) ?? undefined
		);
	});
	// const fieldRef = createMemo(() => {
	// 	return brickHelpers.getFieldRef<UserRef>({
	// 		fieldType: "user",
	// 		fieldValue: fieldValue(),
	// 	});
	// });
	const isDisabled = createMemo(
		() => props.state.fieldConfig.config.isDisabled || brickStore.get.locked,
	);

	// -------------------------------
	// Render
	return (
		<UserSearchSelect
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={fieldValue()}
			setValue={(value) => {
				brickStore.get.setFieldValue({
					brickIndex: props.state.brickIndex,
					fieldConfig: props.state.fieldConfig,
					key: props.state.fieldConfig.key,
					ref: props.state.groupRef,
					repeaterKey: props.state.repeaterKey,
					value: value === undefined ? undefined : Number(value),
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
			}}
			name={props.state.fieldConfig.key}
			errors={props.state.fieldError}
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			disabled={isDisabled()}
			required={props.state.fieldConfig.validation?.required || false}
			hideOptionalText
		/>
	);
};
