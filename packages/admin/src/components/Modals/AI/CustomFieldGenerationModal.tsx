import type { RichTextJSON } from "@lucidcms/rich-text";
import type { CustomFieldInputGenerateResponse } from "@types";
import { FaSolidArrowRotateLeft, FaSolidXmark } from "solid-icons/fa";
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
import { Modal, ModalFooter } from "@/components/Groups/Modal";
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

type GenerateValues = {
	instruction?: string;
	guidance?: string;
};

type DraftEditorProps = {
	fieldType: CustomFieldGenerationFieldType | undefined;
	localeCode: string;
	value: unknown;
	jsonText?: string;
	jsonValid?: boolean;
	selectedLocaleCount: number;
	onChange: (_localeCode: string, _value: unknown) => void;
	onJsonChange: (_localeCode: string, _value: string) => void;
};

const DraftEditor: Component<DraftEditorProps> = (props) => {
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
					rows={props.selectedLocaleCount > 1 ? 5 : 14}
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
	const [generatedLocales, setGeneratedLocales] = createSignal<string[]>([]);
	const [draftValues, setDraftValues] = createSignal<Record<string, unknown>>(
		{},
	);
	const [originalValues, setOriginalValues] = createSignal<
		Record<string, unknown>
	>({});
	const [jsonText, setJsonText] = createSignal<Record<string, string>>({});
	const [jsonValid, setJsonValid] = createSignal<Record<string, boolean>>({});
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
	const isLoading = createMemo(() => generateField.action.isPending);
	const responseError = createMemo(() => {
		return clientError() ?? generateField.errors()?.message;
	});
	const hasInvalidJson = createMemo(
		() =>
			isJsonField(field()?.type) &&
			selectedLocales().some((localeCode) => jsonValid()[localeCode] === false),
	);
	const hasGeneratedValue = createMemo(() => generatedLocales().length > 0);
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
	const normalizeTargetValue = (
		requestTarget: CustomFieldGenerationTarget,
		localeCode: string,
	) => {
		return normalizeOutputValue(
			requestTarget.field().type,
			requestTarget.value(localeCode),
		);
	};
	const setDraft = (
		type: CustomFieldGenerationFieldType | undefined,
		localeCode: string,
		value: unknown,
	) => {
		const normalized = normalizeOutputValue(type, value);
		setDraftValues((previous) => {
			if (safeDeepEqual(previous[localeCode], normalized)) return previous;
			return {
				...previous,
				[localeCode]: normalized,
			};
		});
		if (isJsonField(type)) {
			setJsonText((previous) => ({
				...previous,
				[localeCode]: stringifyJsonValue(normalized),
			}));
			setJsonValid((previous) => ({
				...previous,
				[localeCode]: true,
			}));
		}
	};
	const ensureDraftForLocale = (
		requestTarget: CustomFieldGenerationTarget,
		localeCode: string,
	) => {
		if (Object.hasOwn(draftValues(), localeCode)) return;

		const initialValue = normalizeTargetValue(requestTarget, localeCode);
		setOriginalValues((previous) => ({
			...previous,
			[localeCode]: cloneGenerationValue(initialValue),
		}));
		setDraft(
			requestTarget.field().type,
			localeCode,
			cloneGenerationValue(initialValue),
		);
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

		setSelectedLocales([initialLocale]);
		setOriginalValues(initialValues);
		setDraftValues(initialValues);
		if (isJsonField(requestTarget.field().type)) {
			const initialJsonText = {
				[initialLocale]: stringifyJsonValue(initialValue),
			};
			const initialJsonValid = {
				[initialLocale]: true,
			};
			if (sourceLocale !== initialLocale) {
				initialJsonText[sourceLocale] = stringifyJsonValue(sourceValue);
				initialJsonValid[sourceLocale] = true;
			}
			setJsonText(initialJsonText);
			setJsonValid(initialJsonValid);
		}
	};
	const resetSession = () => {
		setInstruction("");
		setGuidance(undefined);
		setClientError(undefined);
		setLastCost(undefined);
		setGeneratedLocales([]);
		generateField.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const clear = () => {
		resetSession();
		setSelectedLocales([]);
		setDraftValues({});
		setOriginalValues({});
		setJsonText({});
		setJsonValid({});
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
						values: draftValues(),
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
			for (const localeCode of targetLocaleCodes) {
				if (!Object.hasOwn(response.data.output, localeCode)) continue;
				setDraft(
					requestTarget.field().type,
					localeCode,
					response.data.output[localeCode],
				);
				responseLocales.push(localeCode);
			}
			if (responseLocales.length === 0) {
				const fallbackValue = Object.values(response.data.output)[0];
				const fallbackLocale = targetLocaleCodes[0];
				if (fallbackLocale) {
					setDraft(requestTarget.field().type, fallbackLocale, fallbackValue);
					responseLocales.push(fallbackLocale);
				}
			}
			setGeneratedLocales(responseLocales);
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
			for (const localeCode of selectedLocales()) {
				await activeTarget.setValue(draftValues()[localeCode], localeCode);
			}
			close(false);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const updateJsonDraft = (localeCode: string, value: string) => {
		setJsonText((previous) => ({
			...previous,
			[localeCode]: value,
		}));

		try {
			setDraftValues((previous) => ({
				...previous,
				[localeCode]: JSON.parse(value),
			}));
			setJsonValid((previous) => ({
				...previous,
				[localeCode]: true,
			}));
		} catch {
			setJsonValid((previous) => ({
				...previous,
				[localeCode]: false,
			}));
		}
	};
	const revertDraft = () => {
		for (const localeCode of selectedLocales()) {
			setDraft(
				field()?.type,
				localeCode,
				cloneGenerationValue(originalValues()[localeCode]),
			);
		}
		setGeneratedLocales([]);
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
			<div class="flex min-w-0 items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-6 md:py-5">
				<div class="min-w-0">
					<h2>{T()("ai.custom.field.generate.modal.title")}</h2>
					<p class="mt-1 text-sm text-body">
						{T()("ai.custom.field.generate.modal.description", {
							field: field()?.label ?? field()?.key ?? "",
						})}
					</p>
				</div>
				<button
					type="button"
					class="flex h-8 min-w-8 w-8 items-center justify-center rounded-full text-body transition-colors duration-200 hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-error-base"
					onClick={() => close(false)}
					aria-label={T()("common.close")}
				>
					<FaSolidXmark class="fill-current" />
				</button>
			</div>
			<div class="grid min-w-0 w-full gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<form
					class="flex min-h-130 min-w-0 flex-col gap-4 border-b border-border bg-card-base p-4 md:border-r md:border-b-0 md:p-6"
					onSubmit={submit}
				>
					<Show when={guidanceOptions().length > 0}>
						<div class="min-w-0">
							<span class="text-sm text-body">
								{T()("ai.custom.field.generate.guidance.label")}
							</span>
							<div class="mt-2 flex min-w-0 flex-wrap gap-2">
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
							<div class="flex min-w-0 items-center justify-between gap-3">
								<span class="text-sm text-body">
									{T()("ai.custom.field.generate.locales.label")}
								</span>
								<span class="text-xs text-unfocused">
									{T()("ai.custom.field.generate.locales.selected", {
										count: selectedLocales().length,
									})}
								</span>
							</div>
							<div class="mt-2 flex min-w-0 flex-wrap gap-2">
								<For each={localeOptions()}>
									{(locale) => {
										const selected = createMemo(() =>
											selectedLocales().includes(locale.code),
										);

										return (
											<button
												type="button"
												class="rounded-full focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60"
												aria-pressed={selected()}
												disabled={isLoading()}
												onClick={() => toggleLocale(locale.code)}
											>
												<Pill theme={selected() ? "primary-opaque" : "outline"}>
													{locale.name ?? locale.code}
												</Pill>
											</button>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
					<div>
						<Label
							id="ai-custom-field-generation-instruction"
							label={T()("ai.custom.field.generate.instruction.label")}
							theme="basic"
						/>
						<textarea
							id="ai-custom-field-generation-instruction"
							name="ai-custom-field-generation-instruction"
							value={instruction()}
							onInput={(event) => setInstruction(event.currentTarget.value)}
							onKeyDown={(event) => {
								event.stopPropagation();
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									submit();
								}
							}}
							placeholder={T()(
								"ai.custom.field.generate.instruction.placeholder",
							)}
							rows={7}
							class="block min-w-0 max-w-full w-full resize-none rounded-md border border-border bg-input-base p-3 text-sm font-medium text-title outline-hidden transition-colors duration-200 placeholder:text-body focus:border-primary-base"
						/>
					</div>
					<Show when={responseError()}>
						{(error) => (
							<div class="min-w-0 rounded-md border border-error-base/30 bg-error-base/10 p-3">
								<p class="text-sm text-error-base">{error()}</p>
							</div>
						)}
					</Show>
					<div class="mt-auto">
						<Button
							type="submit"
							theme="secondary"
							size="medium"
							classes="w-full"
							loading={isLoading()}
							disabled={!canGenerate()}
						>
							{T()("ai.custom.field.generate.modal.generate")}
						</Button>
					</div>
				</form>
				<div class="flex min-h-130 min-w-0 flex-col p-4 md:p-6">
					<div class="mb-4 flex min-w-0 items-center justify-between gap-3">
						<div class="min-w-0">
							<h3 class="text-base font-semibold text-title">
								{T()("ai.custom.field.generate.response.title")}
							</h3>
							<Show when={field()?.localized}>
								<p class="mt-1 text-xs text-body">
									{T()("ai.custom.field.generate.response.locale.count", {
										count: selectedLocales().length,
									})}
								</p>
							</Show>
						</div>
						<Show when={hasGeneratedValue()}>
							<Button
								type="button"
								theme="secondary-subtle"
								size="icon-subtle"
								title={T()("ai.custom.field.generate.response.revert")}
								aria-label={T()("ai.custom.field.generate.response.revert")}
								onClick={revertDraft}
								disabled={isLoading() || aiModalsStore.get.isApplying}
							>
								<FaSolidArrowRotateLeft size={11} aria-hidden="true" />
							</Button>
						</Show>
					</div>
					<div class="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
						<Show
							when={field()?.localized}
							fallback={
								<DraftEditor
									fieldType={field()?.type}
									localeCode={selectedLocales()[0] ?? defaultLocale()}
									value={draftValues()[selectedLocales()[0] ?? defaultLocale()]}
									jsonText={jsonText()[selectedLocales()[0] ?? defaultLocale()]}
									jsonValid={
										jsonValid()[selectedLocales()[0] ?? defaultLocale()]
									}
									selectedLocaleCount={1}
									onChange={(targetLocale, nextValue) =>
										setDraft(field()?.type, targetLocale, nextValue)
									}
									onJsonChange={updateJsonDraft}
								/>
							}
						>
							<For each={selectedLocales()}>
								{(localeCode) => (
									<div class="min-w-0 rounded-md border border-border bg-card-base p-3">
										<div class="mb-2 min-w-0">
											<label
												for={`ai-custom-field-generation-preview-${field()?.type}-${localeCode}`}
												class="min-w-0 truncate text-sm font-semibold text-title"
											>
												{getLocaleLabel(localeCode)}
											</label>
										</div>
										<DraftEditor
											fieldType={field()?.type}
											localeCode={localeCode}
											value={draftValues()[localeCode]}
											jsonText={jsonText()[localeCode]}
											jsonValid={jsonValid()[localeCode]}
											selectedLocaleCount={selectedLocales().length}
											onChange={(targetLocale, nextValue) =>
												setDraft(field()?.type, targetLocale, nextValue)
											}
											onJsonChange={updateJsonDraft}
										/>
									</div>
								)}
							</For>
						</Show>
					</div>
				</div>
			</div>
			<ModalFooter>
				<div class="flex items-center gap-2">
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={() => close(false)}
					>
						{T()("common.cancel")}
					</Button>
				</div>
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
			</ModalFooter>
		</Modal>
	);
};

export default CustomFieldGenerationModal;
