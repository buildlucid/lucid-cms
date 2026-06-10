import type { FieldError, FieldValue, InternalDocumentField } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	lazy,
	Suspense,
	untrack,
} from "solid-js";
import useCustomFieldGeneration from "@/hooks/ai/useCustomFieldGeneration";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

const JSONTextarea = lazy(() =>
	import("@/components/Groups/Form/JSONTextarea").then((m) => ({
		default: m.JSONTextarea,
	})),
);

interface JSONFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"json">;
		fieldData?: InternalDocumentField;
		groupRef?: string;
		repeaterKey?: string;
		fieldError: FieldError | undefined;
		altLocaleError: boolean;
		localised: boolean;
		fieldColumnIsMissing: boolean;
	};
}

export const JSONField: Component<JSONFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const [getValue, setValue] = createSignal("");
	const customFieldGeneration = useCustomFieldGeneration();
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldData = createMemo(() => {
		return props.state.fieldData;
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue<Record<string, unknown> | null>({
			fieldData: fieldData(),
			fieldConfig: props.state.fieldConfig,
			contentLocale: fieldRenderState.contentLocale(),
		});
	});
	const disabled = createMemo(
		() => props.state.fieldConfig.config.disabled || brickStore.get.locked,
	);
	const aiGuidance = createMemo(
		() =>
			props.state.fieldConfig.ai?.guidance?.map((item) => ({
				key: item.key,
				label: helpers.getLocaleValue({
					value: item.label,
					fallback: item.key,
				}),
			})) ?? [],
	);

	const AiGenerationButton = customFieldGeneration.createActionButton({
		field: () => ({
			key: props.state.fieldConfig.key,
			type: "json" as const,
			label: helpers.getLocaleValue({
				value: props.state.fieldConfig.details.label,
				fallback: props.state.fieldConfig.key,
			}),
			localized: props.state.localised,
			guidance: aiGuidance(),
		}),
		request: () => ({
			collectionKey: fieldRenderState.collectionKey(),
			brickKey: fieldRenderState.brickKey(),
			fieldKey: props.state.fieldConfig.key,
			locale: {
				source: fieldRenderState.contentLocale() || undefined,
				target: fieldRenderState.contentLocale()
					? [fieldRenderState.contentLocale()]
					: [],
			},
		}),
		value: (localeCode?: string) =>
			brickHelpers.getFieldValue<Record<string, unknown> | null>({
				fieldData: fieldData(),
				fieldConfig: props.state.fieldConfig,
				contentLocale: localeCode ?? fieldRenderState.contentLocale(),
			}),
		document: () => ({
			fields: brickHelpers.getCollectionPseudoBrickFields(),
			bricks: brickHelpers.getUpsertBricks(),
		}),
		setValue: (value: unknown, localeCode?: string) => {
			const targetLocale = localeCode ?? fieldRenderState.contentLocale();
			brickStore.get.setFieldValue({
				brickIndex: fieldRenderState.brickIndex(),
				fieldConfig: props.state.fieldConfig,
				key: props.state.fieldConfig.key,
				ref: props.state.groupRef,
				repeaterKey: props.state.repeaterKey,
				value: value as FieldValue,
				contentLocale: targetLocale,
			});
			if (
				!props.state.localised ||
				targetLocale === fieldRenderState.contentLocale()
			) {
				setValue(JSON.stringify(value ?? {}, null, 2));
			}
		},
		disabled,
	});

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
					brickIndex: fieldRenderState.brickIndex(),
					groupRef: props.state.groupRef,
				})}
				value={getValue()}
				onChange={(value) => {
					setValue(value);
					try {
						brickStore.get.setFieldValue({
							brickIndex: fieldRenderState.brickIndex(),
							fieldConfig: props.state.fieldConfig,
							key: props.state.fieldConfig.key,
							ref: props.state.groupRef,
							repeaterKey: props.state.repeaterKey,
							value: JSON.parse(value),
							contentLocale: fieldRenderState.contentLocale(),
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
				disabled={disabled()}
				errors={props.state.fieldError}
				required={props.state.fieldConfig.validation?.required || false}
				fieldColumnIsMissing={props.state.fieldColumnIsMissing}
				labelRightSlot={
					props.state.fieldConfig.ai?.enabled === true ? (
						<AiGenerationButton />
					) : undefined
				}
				hideOptionalText
			/>
		</Suspense>
	);
};
