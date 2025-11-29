import {
	type Component,
	createSignal,
	createMemo,
	batch,
	createEffect,
} from "solid-js";
import type { CFConfig, MediaRef, FieldResponse, FieldError } from "@types";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";
import { MediaSelect } from "@/components/Groups/Form";

interface MediaFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"media">;
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

export const MediaField: Component<MediaFieldProps> = (props) => {
	// -------------------------------
	// State
	const [getValue, setValue] = createSignal<number | undefined>();

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
	const fieldRef = createMemo(() => {
		return brickHelpers.getFieldRef<MediaRef>({
			fieldType: "media",
			fieldValue: fieldValue(),
		});
	});
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
			ref={fieldRef}
			onChange={(value, ref) => {
				batch(() => {
					if (ref) brickStore.get.addRef("media", ref);
					brickStore.get.setFieldValue({
						brickIndex: props.state.brickIndex,
						fieldConfig: props.state.fieldConfig,
						key: props.state.fieldConfig.key,
						ref: props.state.groupRef,
						repeaterKey: props.state.repeaterKey,
						value: value,
						contentLocale: props.state.contentLocale,
					});
					setValue(value ?? undefined);
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
			errors={props.state.fieldError}
			required={props.state.fieldConfig.validation?.required || false}
			fieldColumnIsMissing={props.state.fieldColumnIsMissing}
		/>
	);
};
