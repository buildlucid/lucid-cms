import type { CFConfig, FieldError, FieldResponse } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	lazy,
	Suspense,
	untrack,
} from "solid-js";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

const JSONTextarea = lazy(() =>
	import("@/components/Groups/Form/JSONTextarea").then((m) => ({
		default: m.JSONTextarea,
	})),
);

interface JSONFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"json">;
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

export const JSONField: Component<JSONFieldProps> = (props) => {
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
		const storeVal = fieldValue();
		const compact = JSON.stringify(storeVal ?? "");

		const current = untrack(getValue);
		try {
			if (JSON.stringify(JSON.parse(current)) === compact) return;
		} catch {
			// current editor content is invalid JSON — fall through to update
		}

		setValue(JSON.stringify(storeVal ?? "", null, 2));
	});

	// -------------------------------
	// Render
	return (
		<Suspense
			fallback={
				<div class="w-full mb-3 last:mb-0">
					<div class="h-52 bg-input-base border border-border rounded-md animate-pulse" />
				</div>
			}
		>
			<JSONTextarea
				id={brickHelpers.customFieldId({
					key: props.state.fieldConfig.key,
					brickIndex: props.state.brickIndex,
					groupRef: props.state.groupRef,
				})}
				value={getValue()}
				onChange={(value) => {
					setValue(value);
					try {
						brickStore.get.setFieldValue({
							brickIndex: props.state.brickIndex,
							fieldConfig: props.state.fieldConfig,
							key: props.state.fieldConfig.key,
							ref: props.state.groupRef,
							repeaterKey: props.state.repeaterKey,
							value: JSON.parse(value),
							contentLocale: props.state.contentLocale,
						});
					} catch {
						// store retains last valid JSON
					}
				}}
				name={props.state.fieldConfig.key}
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
				disabled={isDisabled()}
				errors={props.state.fieldError}
				required={props.state.fieldConfig.validation?.required || false}
				fieldColumnIsMissing={props.state.fieldColumnIsMissing}
				hideOptionalText
			/>
		</Suspense>
	);
};
