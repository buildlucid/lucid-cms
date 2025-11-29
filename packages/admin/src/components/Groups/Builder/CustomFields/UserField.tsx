import {
	type Component,
	createSignal,
	batch,
	createMemo,
	createEffect,
} from "solid-js";
import type { CFConfig, FieldResponse, FieldError, UserRef } from "@types";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import UserSearchSelect from "@/components/Partials/SearchSelects/UserSearchSelect";

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
	// State
	const [getValue, setValue] = createSignal<number>();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<number>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: props.state.contentLocale,
		});
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
	// Effects
	createEffect(() => {
		setValue(fieldValue());
	});

	// -------------------------------
	// Render
	return (
		<UserSearchSelect
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={getValue()}
			setValue={(value) => {
				batch(() => {
					brickStore.get.setFieldValue({
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value === undefined ? undefined : Number(value),
						contentLocale: props.state.contentLocale,
					});
					setValue(value as number | undefined);
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
		/>
	);
};
