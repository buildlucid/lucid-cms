import type { CFConfig, FieldError, FieldResponse } from "@types";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { MediaSelect } from "@/components/Groups/Form";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getChangedItemErrorStartIndex } from "@/utils/field-error-helpers";
import helpers from "@/utils/helpers";

interface MediaFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"media">;
		fieldData?: FieldResponse;
		groupRef?: string;
		repeaterKey?: string;
		contentLocale: string;
		fieldError: FieldError | undefined;
		fieldErrors: FieldError[];
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const MediaField: Component<MediaFieldProps> = (props) => {
	// -------------------------------
	// State
	const [getValue, setValue] = createSignal<number[] | undefined>();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<number[]>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: props.state.contentLocale,
		});
	});
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRefs({
			fieldType: "media",
			fieldValue: fieldValue(),
		});
	});
	const isMultiple = createMemo(
		() => props.state.fieldConfig.config.multiple === true,
	);
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
		<MediaSelect
			id={brickHelpers.customFieldId({
				key: props.state.fieldConfig.key,
				brickIndex: props.state.brickIndex,
				groupRef: props.state.groupRef,
			})}
			value={getValue()}
			refs={fieldRef}
			multiple={isMultiple()}
			onChange={(value, refs) => {
				const clearFromItemIndex = isMultiple()
					? getChangedItemErrorStartIndex(
							fieldValue(),
							value,
							(left, right) => left === right,
						)
					: undefined;

				batch(() => {
					if (refs.length) brickStore.get.addRef("media", refs);
					brickStore.get.setFieldValue({
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value,
						contentLocale: props.state.contentLocale,
						clearFromItemIndex,
					});
					setValue(value);
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
			altLocaleError={props.state.altLocaleError}
			localised={props.state.localised}
			disabled={isDisabled()}
			extensions={props.state.fieldConfig.validation?.extensions}
			type={props.state.fieldConfig.validation?.type}
			errors={isMultiple() ? props.state.fieldErrors : props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
			hideOptionalText
		/>
	);
};
