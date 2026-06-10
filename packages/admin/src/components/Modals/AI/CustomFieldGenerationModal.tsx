import type { RichTextJSON } from "@lucidcms/rich-text";
import type { CustomFieldInputGenerateResponse } from "@types";
import classnames from "classnames";
import {
	FaSolidLanguage,
	FaSolidMagicWandSparkles,
	FaSolidPaperPlane,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	on,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import {
	Input,
	JSONTextarea,
	Label,
	RichText,
	Textarea,
} from "@/components/Groups/Form";
import { Modal } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import aiModalsStore, {
	type CustomFieldGenerationFieldType,
	type CustomFieldGenerationTarget,
} from "@/store/aiModalsStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import {
	cloneGenerationValue,
	createLocaleValueRecord,
	isJsonField,
	normalizeOutputValue,
	stringifyJsonValue,
} from "@/utils/custom-field-generation";
import { LucidError } from "@/utils/error-handling";
import formatAiCost from "@/utils/format-ai-cost";
import safeDeepEqual from "@/utils/safe-deep-equal";
import spawnToast from "@/utils/spawn-toast";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";
import GenerationHistory, {
	type AiGenerationHistoryItem,
} from "./GenerationHistory";

type GenerateValues = {
	instruction?: string;
	guidance?: string;
};

const CURRENT_HISTORY_ITEM_ID = "current-value";

type GenerationHistoryItem = {
	id: string;
	type: "current" | "generation";
	values: Record<string, unknown>;
	jsonText: Record<string, string>;
	jsonValid: Record<string, boolean>;
	generatedLocales: string[];
	cost?: CustomFieldInputGenerateResponse["usage"]["cost"];
};

const DraftEditor: Component<{
	fieldType: CustomFieldGenerationFieldType | undefined;
	localeCode: string;
	value: unknown;
	jsonText?: string;
	jsonValid?: boolean;
	selectedLocaleCount: number;
	onChange: (_localeCode: string, _value: unknown) => void;
	onJsonChange: (_localeCode: string, _value: string) => void;
}> = (props) => {
	return (
		<Switch>
			<Match when={props.fieldType === "text"}>
				<Input
					id={`ai-custom-field-generation-preview-text-${props.localeCode}`}
					name={`ai-custom-field-generation-preview-text-${props.localeCode}`}
					type="text"
					value={typeof props.value === "string" ? props.value : ""}
					onChange={(nextValue) => props.onChange(props.localeCode, nextValue)}
					noMargin
				/>
			</Match>
			<Match when={props.fieldType === "textarea"}>
				<Textarea
					id={`ai-custom-field-generation-preview-textarea-${props.localeCode}`}
					name={`ai-custom-field-generation-preview-textarea-${props.localeCode}`}
					value={typeof props.value === "string" ? props.value : ""}
					onChange={(nextValue) => props.onChange(props.localeCode, nextValue)}
					rows={props.selectedLocaleCount > 1 ? 4 : 10}
					noMargin
				/>
			</Match>
			<Match when={props.fieldType === "json"}>
				<div>
					<JSONTextarea
						id={`ai-custom-field-generation-preview-json-${props.localeCode}`}
						name={`ai-custom-field-generation-preview-json-${props.localeCode}`}
						value={props.jsonText ?? stringifyJsonValue(props.value)}
						onChange={(nextValue) =>
							props.onJsonChange(props.localeCode, nextValue)
						}
						noMargin
					/>
					<Show when={props.jsonValid === false}>
						<p class="mt-2 text-sm text-error-base">
							{T()("ai.custom.field.generate.preview.json.invalid")}
						</p>
					</Show>
				</div>
			</Match>
			<Match when={props.fieldType === "rich-text"}>
				<RichText
					id={`ai-custom-field-generation-preview-rich-text-${props.localeCode}`}
					value={props.value as RichTextJSON}
					onChange={(nextValue) => props.onChange(props.localeCode, nextValue)}
					noMargin
				/>
			</Match>
		</Switch>
	);
};

const CustomFieldGenerationModal: Component = () => {
	// -----------------------------
	// State
	const [instruction, setInstruction] = createSignal("");
	const [guidance, setGuidance] = createSignal<string>();
	const [selectedLocales, setSelectedLocales] = createSignal<string[]>([]);
	const [historyItems, setHistoryItems] = createSignal<GenerationHistoryItem[]>(
		[],
	);
	const [activeHistoryItemId, setActiveHistoryItemId] = createSignal(
		CURRENT_HISTORY_ITEM_ID,
	);
	const [generationSequence, setGenerationSequence] = createSignal(0);
	const [lastCost, setLastCost] =
		createSignal<CustomFieldInputGenerateResponse["usage"]["cost"]>();
	const [clientError, setClientError] = createSignal<string>();
	let abortController: AbortController | undefined;

	// -----------------------------
	// Mutations
	const generateField = api.ai.useCustomFieldGenerate();

	// -----------------------------
	// Memos
	const modal = createMemo(() =>
		aiModalsStore.getModal("customFieldGeneration"),
	);
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const field = createMemo(() => target()?.field());
	const defaultLocale = createMemo(() =>
		getDefaultTranslationLocale(contentLocaleStore.get.locales),
	);
	const sourceLocale = createMemo(() => {
		const targets = selectedLocales();
		if (targets.length === 1) return targets[0] ?? defaultLocale();
		return defaultLocale();
	});
	const localeOptions = createMemo(() => {
		if (!field()?.localized) return [];
		return contentLocaleStore.get.locales;
	});
	const guidanceOptions = createMemo(() =>
		(field()?.guidance ?? []).map((item) => ({
			value: item.key,
			label: item.label,
		})),
	);
	const activeHistoryItem = createMemo(() => {
		return (
			historyItems().find((item) => item.id === activeHistoryItemId()) ??
			historyItems()[0]
		);
	});
	const activeValues = createMemo(() => activeHistoryItem()?.values ?? {});
	const activeJsonText = createMemo(() => activeHistoryItem()?.jsonText ?? {});
	const activeJsonValid = createMemo(
		() => activeHistoryItem()?.jsonValid ?? {},
	);
	const isLoading = createMemo(() => generateField.action.isPending);
	const responseError = createMemo(() => {
		return clientError() ?? generateField.errors()?.message;
	});
	const hasInvalidJson = createMemo(
		() =>
			isJsonField(field()?.type) &&
			selectedLocales().some(
				(localeCode) => activeJsonValid()[localeCode] === false,
			),
	);
	const canGenerate = createMemo(
		() =>
			target() !== undefined &&
			selectedLocales().length > 0 &&
			!hasInvalidJson() &&
			!isLoading() &&
			!aiModalsStore.get.isApplying,
	);
	const costLabel = createMemo(() => {
		const cost = lastCost();
		if (!cost) return undefined;

		return formatAiCost(cost);
	});
	const activeLocale = createMemo(
		() => selectedLocales()[0] ?? defaultLocale(),
	);
	const fieldTypeLabel = createMemo(() => {
		const type = field()?.type;
		if (!type) return T()("common.empty");

		return type
			.split("-")
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(" ");
	});
	const fieldModeLabel = createMemo(() =>
		field()?.localized
			? T()("ai.custom.field.generate.context.mode.localized")
			: T()("ai.custom.field.generate.context.mode.single"),
	);

	// -----------------------------
	// Functions
	const abortRequest = () => {
		abortController?.abort();
		abortController = undefined;
	};
	const getLocaleLabel = (localeCode: string) => {
		const locale = contentLocaleStore.get.locales.find(
			(item) => item.code === localeCode,
		);

		if (!locale) return localeCode;
		return `${locale.name ?? locale.code} (${locale.code})`;
	};
	const cloneValueRecord = (values: Record<string, unknown>) => {
		const clonedValues: Record<string, unknown> = {};
		for (const [localeCode, value] of Object.entries(values)) {
			clonedValues[localeCode] = cloneGenerationValue(value);
		}
		return clonedValues;
	};
	const createJsonState = (
		type: CustomFieldGenerationFieldType | undefined,
		values: Record<string, unknown>,
	) => {
		const jsonText: Record<string, string> = {};
		const jsonValid: Record<string, boolean> = {};

		if (isJsonField(type)) {
			for (const [localeCode, value] of Object.entries(values)) {
				jsonText[localeCode] = stringifyJsonValue(value);
				jsonValid[localeCode] = true;
			}
		}

		return {
			jsonText,
			jsonValid,
		};
	};
	const normalizeTargetValue = (
		requestTarget: CustomFieldGenerationTarget,
		localeCode: string,
	) => {
		return normalizeOutputValue(
			requestTarget.field().type,
			requestTarget.value(localeCode),
		);
	};
	const ensureHistoryItemLocales = (
		item: GenerationHistoryItem,
		requestTarget: CustomFieldGenerationTarget,
		localeCodes: string[],
	): GenerationHistoryItem => {
		let changed = false;
		const nextValues = { ...item.values };
		const nextJsonText = { ...item.jsonText };
		const nextJsonValid = { ...item.jsonValid };
		const type = requestTarget.field().type;

		for (const localeCode of localeCodes) {
			if (Object.hasOwn(nextValues, localeCode)) continue;

			const initialValue = normalizeTargetValue(requestTarget, localeCode);
			nextValues[localeCode] = cloneGenerationValue(initialValue);
			if (isJsonField(type)) {
				nextJsonText[localeCode] = stringifyJsonValue(initialValue);
				nextJsonValid[localeCode] = true;
			}
			changed = true;
		}

		if (!changed) return item;

		return {
			...item,
			values: nextValues,
			jsonText: nextJsonText,
			jsonValid: nextJsonValid,
		};
	};
	const ensureActiveHistoryLocales = (
		requestTarget: CustomFieldGenerationTarget,
		localeCodes: string[],
	) => {
		const activeId = activeHistoryItemId();
		setHistoryItems((previous) =>
			previous.map((item) =>
				item.id === activeId
					? ensureHistoryItemLocales(item, requestTarget, localeCodes)
					: item,
			),
		);
	};
	const selectHistoryItem = (itemId: string) => {
		const activeTarget = target();
		if (activeTarget) {
			setHistoryItems((previous) =>
				previous.map((item) =>
					item.id === itemId
						? ensureHistoryItemLocales(item, activeTarget, selectedLocales())
						: item,
				),
			);
		}
		setActiveHistoryItemId(itemId);
	};
	const historyItemLabel = (item: GenerationHistoryItem, index: number) => {
		if (item.type === "current") {
			return T()("ai.custom.field.generate.history.current");
		}

		return T()("ai.custom.field.generate.history.generation", {
			count: index,
		});
	};
	const historyItemMeta = (item: GenerationHistoryItem) => {
		if (item.type === "current") {
			return T()("ai.custom.field.generate.response.status.current");
		}

		const cost = formatAiCost(item.cost);
		if (cost) return cost;

		return T()("ai.custom.field.generate.quick.review.label");
	};
	const generationHistoryItems = createMemo<AiGenerationHistoryItem[]>(() =>
		historyItems().map((item, index) => ({
			id: item.id,
			label: historyItemLabel(item, index),
			meta: historyItemMeta(item),
		})),
	);
	const setDraft = (
		type: CustomFieldGenerationFieldType | undefined,
		localeCode: string,
		value: unknown,
	) => {
		const normalized = normalizeOutputValue(type, value);
		const activeId = activeHistoryItemId();
		setHistoryItems((previous) =>
			previous.map((item) => {
				if (item.id !== activeId) return item;
				if (safeDeepEqual(item.values[localeCode], normalized)) return item;

				return {
					...item,
					values: {
						...item.values,
						[localeCode]: normalized,
					},
					jsonText: isJsonField(type)
						? {
								...item.jsonText,
								[localeCode]: stringifyJsonValue(normalized),
							}
						: item.jsonText,
					jsonValid: isJsonField(type)
						? {
								...item.jsonValid,
								[localeCode]: true,
							}
						: item.jsonValid,
				};
			}),
		);
	};
	const ensureDraftForLocale = (
		requestTarget: CustomFieldGenerationTarget,
		localeCode: string,
	) => {
		ensureActiveHistoryLocales(requestTarget, [localeCode]);
	};
	const initializeDraft = (requestTarget: CustomFieldGenerationTarget) => {
		const request = requestTarget.request();
		const initialLocale = requestTarget.field().localized
			? (request.locale.target[0] ?? defaultLocale())
			: defaultLocale();
		const sourceLocale = defaultLocale();
		const initialValue = normalizeTargetValue(requestTarget, initialLocale);
		const sourceValue =
			sourceLocale === initialLocale
				? initialValue
				: normalizeTargetValue(requestTarget, sourceLocale);
		const initialValues = {
			[initialLocale]: cloneGenerationValue(initialValue),
		};
		if (sourceLocale !== initialLocale) {
			initialValues[sourceLocale] = cloneGenerationValue(sourceValue);
		}
		const jsonState = createJsonState(
			requestTarget.field().type,
			initialValues,
		);

		setSelectedLocales([initialLocale]);
		setActiveHistoryItemId(CURRENT_HISTORY_ITEM_ID);
		setGenerationSequence(0);
		setHistoryItems([
			{
				id: CURRENT_HISTORY_ITEM_ID,
				type: "current",
				values: initialValues,
				jsonText: jsonState.jsonText,
				jsonValid: jsonState.jsonValid,
				generatedLocales: [],
			},
		]);
	};
	const resetSession = () => {
		setInstruction("");
		setGuidance(undefined);
		setClientError(undefined);
		setLastCost(undefined);
		generateField.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const clear = () => {
		resetSession();
		setSelectedLocales([]);
		setHistoryItems([]);
		setActiveHistoryItemId(CURRENT_HISTORY_ITEM_ID);
		setGenerationSequence(0);
	};
	const close = (open: boolean) => {
		if (open) return;

		abortRequest();
		clear();
		aiModalsStore.close();
	};
	const generate = async (
		values: GenerateValues = {
			instruction: instruction().trim() || undefined,
			guidance: guidance(),
		},
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		const targetRequest = requestTarget?.request();
		const targetLocaleCodes = selectedLocales();
		if (
			!requestTarget ||
			!requestTargetId ||
			!targetRequest?.collectionKey ||
			targetLocaleCodes.length === 0 ||
			hasInvalidJson()
		) {
			return;
		}

		const baseValues = cloneValueRecord(activeValues());
		const baseJsonText = { ...activeJsonText() };
		const baseJsonValid = { ...activeJsonValid() };

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			generateField.reset();
			aiModalsStore.setLoading(true);

			const response = await generateField.action.mutateAsync({
				signal: abortController.signal,
				shouldToast: () => aiModalsStore.isOpen("customFieldGeneration"),
				body: {
					instruction: values.instruction,
					guidance: values.guidance,
					value: createLocaleValueRecord({
						fieldLocalized: requestTarget.field().localized,
						selectedLocales: targetLocaleCodes,
						sourceLocale: sourceLocale(),
						values: baseValues,
						target: requestTarget,
					}),
					document: requestTarget.document(),
					target: {
						collectionKey: targetRequest.collectionKey,
						brickKey: targetRequest.brickKey,
						fieldKey: targetRequest.fieldKey,
					},
					locale: {
						source: sourceLocale(),
						target: targetLocaleCodes,
					},
				},
			});

			if (!isOpen() || targetId() !== requestTargetId) return;

			const responseLocales: string[] = [];
			const nextValues = cloneValueRecord(baseValues);
			const nextJsonText = { ...baseJsonText };
			const nextJsonValid = { ...baseJsonValid };
			const fieldType = requestTarget.field().type;
			for (const localeCode of targetLocaleCodes) {
				if (!Object.hasOwn(response.data.output, localeCode)) continue;
				const normalized = normalizeOutputValue(
					fieldType,
					response.data.output[localeCode],
				);
				nextValues[localeCode] = cloneGenerationValue(normalized);
				if (isJsonField(fieldType)) {
					nextJsonText[localeCode] = stringifyJsonValue(normalized);
					nextJsonValid[localeCode] = true;
				}
				responseLocales.push(localeCode);
			}
			if (responseLocales.length === 0) {
				const fallbackValue = Object.values(response.data.output)[0];
				const fallbackLocale = targetLocaleCodes[0];
				if (fallbackLocale) {
					const normalized = normalizeOutputValue(fieldType, fallbackValue);
					nextValues[fallbackLocale] = cloneGenerationValue(normalized);
					if (isJsonField(fieldType)) {
						nextJsonText[fallbackLocale] = stringifyJsonValue(normalized);
						nextJsonValid[fallbackLocale] = true;
					}
					responseLocales.push(fallbackLocale);
				}
			}
			const nextGenerationIndex = generationSequence() + 1;
			const nextGenerationId = `generation-${nextGenerationIndex}`;
			setGenerationSequence(nextGenerationIndex);
			setHistoryItems((previous) => [
				...previous,
				{
					id: nextGenerationId,
					type: "generation",
					values: nextValues,
					jsonText: nextJsonText,
					jsonValid: nextJsonValid,
					generatedLocales: responseLocales,
					cost: response.data.usage.cost,
				},
			]);
			setActiveHistoryItemId(nextGenerationId);
			setLastCost(response.data.usage.cost);
		} catch (error) {
			if (
				(error instanceof DOMException && error.name === "AbortError") ||
				error instanceof LucidError ||
				!isOpen()
			) {
				return;
			}

			const message =
				error instanceof Error
					? error.message
					: T()("toasts.ai.custom.field.generate.error.message");
			setClientError(message);
			spawnToast({
				title: T()("toasts.ai.custom.field.generate.error.title"),
				message,
				status: "error",
			});
		} finally {
			if (targetId() === requestTargetId) {
				aiModalsStore.setLoading(false);
			}
		}
	};
	const apply = async () => {
		const activeTarget = target();
		if (!activeTarget || hasInvalidJson()) return;

		try {
			aiModalsStore.setApplying(true);
			const values = activeValues();
			for (const localeCode of selectedLocales()) {
				await activeTarget.setValue(values[localeCode], localeCode);
			}
			close(false);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const updateJsonDraft = (localeCode: string, value: string) => {
		const activeId = activeHistoryItemId();
		try {
			const parsedValue = JSON.parse(value);
			setHistoryItems((previous) =>
				previous.map((item) =>
					item.id === activeId
						? {
								...item,
								values: {
									...item.values,
									[localeCode]: parsedValue,
								},
								jsonText: {
									...item.jsonText,
									[localeCode]: value,
								},
								jsonValid: {
									...item.jsonValid,
									[localeCode]: true,
								},
							}
						: item,
				),
			);
		} catch {
			setHistoryItems((previous) =>
				previous.map((item) =>
					item.id === activeId
						? {
								...item,
								jsonText: {
									...item.jsonText,
									[localeCode]: value,
								},
								jsonValid: {
									...item.jsonValid,
									[localeCode]: false,
								},
							}
						: item,
				),
			);
		}
	};
	const toggleLocale = (localeCode: string) => {
		const activeTarget = target();
		if (!activeTarget || isLoading()) return;

		const selected = selectedLocales();
		if (selected.includes(localeCode)) {
			if (selected.length === 1) return;
			setSelectedLocales(selected.filter((item) => item !== localeCode));
			return;
		}

		ensureDraftForLocale(activeTarget, localeCode);
		setSelectedLocales([...selected, localeCode]);
	};
	const submit = (event?: SubmitEvent) => {
		event?.preventDefault();
		if (!canGenerate()) return;
		void generate();
	};

	// -----------------------------
	// Effects
	createEffect(
		on(targetId, (id) => {
			abortRequest();
			clear();

			const activeTarget = target();
			if (!id || !activeTarget) return;

			initializeDraft(activeTarget);
		}),
	);

	onCleanup(() => {
		abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<Modal
			state={{
				open: isOpen(),
				setOpen: close,
			}}
			options={{
				size: "large",
				noPadding: true,
			}}
		>
			<div class="grid min-w-0 w-full items-stretch gap-0 md:grid-cols-[minmax(24rem,0.5fr)_minmax(0,1fr)]">
				<form
					class="flex min-h-130 min-w-0 flex-col gap-4 border-b border-border bg-card-base p-4 md:border-r md:border-b-0 md:p-6"
					onSubmit={submit}
				>
					<div class="min-w-0 border-b border-border pb-4">
						<div class="min-w-0">
							<p class="truncate text-xs font-medium leading-4 text-body">
								{T()("ai.custom.field.generate.context.title")}
							</p>
							<div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<p class="min-w-0 truncate text-sm font-semibold leading-5 text-title">
									{field()?.label ?? field()?.key ?? T()("common.empty")}
								</p>
								<div class="flex min-w-0 flex-wrap gap-2 sm:justify-end">
									<Pill theme="primary-opaque">{fieldModeLabel()}</Pill>
									<Pill theme="outline">{fieldTypeLabel()}</Pill>
								</div>
							</div>
						</div>
					</div>
					<Show when={guidanceOptions().length > 0}>
						<div class="min-w-0">
							<Label
								id="ai-custom-field-generation-guidance"
								label={T()("ai.custom.field.generate.guidance.label")}
								theme="basic"
								hideOptionalText
							/>
							<div class="flex min-w-0 flex-wrap gap-2">
								<For each={guidanceOptions()}>
									{(option) => {
										const selected = createMemo(
											() => guidance() === option.value,
										);

										return (
											<button
												type="button"
												class="rounded-full focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60"
												aria-pressed={selected()}
												disabled={isLoading()}
												onClick={() =>
													setGuidance(selected() ? undefined : option.value)
												}
											>
												<Pill theme={selected() ? "primary-opaque" : "outline"}>
													{option.label}
												</Pill>
											</button>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
					<Show when={field()?.localized}>
						<div class="min-w-0">
							<Label
								id="ai-custom-field-generation-locales"
								label={T()("ai.custom.field.generate.locales.label")}
								theme="basic"
								hideOptionalText
								rightSlot={
									<span class="text-xs text-unfocused">
										{T()("ai.custom.field.generate.locales.selected", {
											count: selectedLocales().length,
										})}
									</span>
								}
							/>
							<div class="grid min-w-0 gap-2">
								<For each={localeOptions()}>
									{(locale) => {
										const selected = createMemo(() =>
											selectedLocales().includes(locale.code),
										);

										return (
											<button
												type="button"
												class={classnames(
													"flex h-10 min-w-0 items-center justify-between gap-3 rounded-md border px-3 text-left transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
													{
														"border-primary-muted-border bg-primary-muted-bg text-title":
															selected(),
														"border-border bg-input-base text-body hover:text-title":
															!selected(),
													},
												)}
												aria-pressed={selected()}
												disabled={isLoading()}
												onClick={() => toggleLocale(locale.code)}
											>
												<span class="flex min-w-0 items-center gap-2">
													<FaSolidLanguage
														class={classnames(
															"shrink-0 transition-colors duration-200",
															{
																"text-primary-base": selected(),
																"text-icon-fade": !selected(),
															},
														)}
														size={13}
														aria-hidden="true"
													/>
													<span class="min-w-0 truncate text-sm font-medium">
														{locale.name ?? locale.code}
													</span>
												</span>
												<span class="shrink-0 text-xs text-unfocused">
													{locale.code}
												</span>
											</button>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
					<div>
						<Textarea
							id="ai-custom-field-generation-instruction"
							name="ai-custom-field-generation-instruction"
							value={instruction()}
							onChange={setInstruction}
							onKeyUp={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									submit();
								}
							}}
							copy={{
								label: T()("ai.custom.field.generate.instruction.label"),
								placeholder: T()(
									"ai.custom.field.generate.instruction.placeholder",
								),
							}}
							rows={5}
						/>
						<Show when={responseError()}>
							{(error) => (
								<div class="mt-3 min-w-0 rounded-md border border-error-base/30 bg-error-base/10 p-3">
									<p class="text-sm text-error-base">{error()}</p>
								</div>
							)}
						</Show>
					</div>
					<div class="mt-auto">
						<Button
							type="submit"
							theme="secondary"
							size="medium"
							classes="w-full min-w-0! gap-2"
							loading={isLoading()}
							disabled={!canGenerate()}
						>
							<FaSolidPaperPlane size={12} aria-hidden="true" />
							{T()("ai.custom.field.generate.modal.generate")}
						</Button>
					</div>
				</form>
				<div class="dotted-background relative flex min-h-130 min-w-0 flex-col self-stretch overflow-hidden px-4 md:px-6">
					<div class="relative min-h-0 min-w-0 flex-1">
						<div class="relative z-10 flex h-full min-h-0 min-w-0 flex-col gap-3 md:grid md:grid-cols-[116px_minmax(0,1fr)] md:gap-4">
							<GenerationHistory
								id="ai-custom-field-generation-history"
								items={generationHistoryItems()}
								activeItemId={activeHistoryItem()?.id}
								onSelect={selectHistoryItem}
								loading={isLoading()}
								loadingLabel={T()(
									"ai.custom.field.generate.history.generating",
								)}
								loadingMeta={T()(
									"ai.custom.field.generate.history.generating.meta",
								)}
							/>
							<div class="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pt-0 pr-1 pb-0 md:py-6">
								<Show
									when={field()?.localized}
									fallback={
										<div class="min-w-0 overflow-hidden rounded-lg border border-border bg-background-base">
											<div class="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
												<label
													for={`ai-custom-field-generation-preview-${field()?.type}-${activeLocale()}`}
													class="min-w-0 truncate text-sm font-medium text-body"
												>
													{field()?.label ??
														T()("ai.custom.field.generate.response.title")}
												</label>
												<Show when={activeHistoryItem()?.type === "generation"}>
													<FaSolidMagicWandSparkles
														class="shrink-0 text-icon-base"
														size={12}
														aria-hidden="true"
													/>
												</Show>
											</div>
											<div class="p-3">
												<DraftEditor
													fieldType={field()?.type}
													localeCode={activeLocale()}
													value={activeValues()[activeLocale()]}
													jsonText={activeJsonText()[activeLocale()]}
													jsonValid={activeJsonValid()[activeLocale()]}
													selectedLocaleCount={1}
													onChange={(targetLocale, nextValue) =>
														setDraft(field()?.type, targetLocale, nextValue)
													}
													onJsonChange={updateJsonDraft}
												/>
											</div>
										</div>
									}
								>
									<For each={selectedLocales()}>
										{(localeCode) => {
											const generated = createMemo(() =>
												(activeHistoryItem()?.generatedLocales ?? []).includes(
													localeCode,
												),
											);

											return (
												<div class="min-w-0 overflow-hidden rounded-lg border border-border bg-background-base transition-colors duration-200">
													<div class="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
														<label
															for={`ai-custom-field-generation-preview-${field()?.type}-${localeCode}`}
															class="flex min-w-0 items-center gap-2 text-sm font-medium text-body"
														>
															<FaSolidLanguage
																class="shrink-0 text-icon-fade"
																size={12}
																aria-hidden="true"
															/>
															<span class="min-w-0 truncate">
																{getLocaleLabel(localeCode)}
															</span>
														</label>
														<Show when={generated()}>
															<FaSolidMagicWandSparkles
																class="shrink-0 text-icon-base"
																size={12}
																aria-hidden="true"
															/>
														</Show>
													</div>
													<div class="p-3">
														<DraftEditor
															fieldType={field()?.type}
															localeCode={localeCode}
															value={activeValues()[localeCode]}
															jsonText={activeJsonText()[localeCode]}
															jsonValid={activeJsonValid()[localeCode]}
															selectedLocaleCount={selectedLocales().length}
															onChange={(targetLocale, nextValue) =>
																setDraft(field()?.type, targetLocale, nextValue)
															}
															onJsonChange={updateJsonDraft}
														/>
													</div>
												</div>
											);
										}}
									</For>
								</Show>
							</div>
						</div>
						<Show when={isLoading()}>
							<div class="absolute inset-0 z-20 flex items-center justify-center bg-background-base/70 p-6 backdrop-blur-sm">
								<div class="flex min-w-0 max-w-xs flex-col items-center gap-3 text-center">
									<span
										class="ai-action-button__surface flex h-11 min-w-11 items-center justify-center rounded-md border border-border text-primary-base"
										data-loading="true"
									>
										<FaSolidMagicWandSparkles size={16} aria-hidden="true" />
									</span>
									<div class="min-w-0">
										<p class="text-sm font-semibold text-title">
											{T()("ai.custom.field.generate.loading")}
										</p>
										<p class="mt-1 text-sm leading-5 text-body">
											{T()(
												"ai.custom.field.generate.response.generating.description",
											)}
										</p>
									</div>
								</div>
							</div>
						</Show>
					</div>
					<div class="relative z-10 -mx-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card-base/95 p-6 backdrop-blur-sm md:-mx-6">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							onClick={() => close(false)}
						>
							{T()("common.cancel")}
						</Button>
						<div class="flex items-center gap-3">
							<Show when={costLabel()}>
								{(cost) => (
									<p class="hidden text-xs text-body sm:block">
										{T()("ai.media.image.generate.cost.total", {
											cost: cost(),
										})}
									</p>
								)}
							</Show>
							<Button
								type="button"
								theme="primary"
								size="medium"
								onClick={() => {
									void apply();
								}}
								disabled={
									hasInvalidJson() ||
									selectedLocales().length === 0 ||
									isLoading() ||
									aiModalsStore.get.isApplying ||
									!target()
								}
							>
								{T()("ai.custom.field.generate.modal.accept")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default CustomFieldGenerationModal;
