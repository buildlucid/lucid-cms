import type { AiGeneratedContent } from "@lucidcms/types";
import type {
	Locale,
	MediaAltGenerateResponse,
	MediaTranslation,
} from "@types";
import {
	FaSolidArrowRotateLeft,
	FaSolidMagicWandSparkles,
	FaSolidPaperPlane,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { Label } from "@/components/Groups/Form/Label";
import { Textarea } from "@/components/Groups/Form/Textarea";
import { Modal } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import aiModalsStore, {
	type MediaAltGenerationTarget,
} from "@/store/aiModalsStore";
import siteStore from "@/store/siteStore";
import T from "@/translations";
import {
	generatedContentEntries,
	mediaGenerationValue,
} from "@/utils/ai-generated-content";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import formatAiCost, { sumAiCredits } from "@/utils/format-ai-cost";
import spawnToast from "@/utils/spawn-toast";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";
import GenerationHistory, {
	type AiGenerationHistoryItem,
} from "./GenerationHistory";

const CURRENT_ALT_ID = "current-alt";

type GenerateValues = {
	instruction?: string;
	localeCodes?: Array<string | null>;
};

export type MediaAltGenerationCandidate = {
	id: string;
	instruction?: string;
	output: Map<string | null, string>;
	originalOutput: Map<string | null, string>;
	cost: MediaAltGenerateResponse["usage"]["cost"];
};

const MediaAltGenerationModalContent: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	imageUrl?: string;
	locales: Locale[];
	selectedLocales: Array<string | null>;
	currentAlt?: Map<string | null, string>;
	generations: MediaAltGenerationCandidate[];
	selectedGenerationId?: string;
	error?: string;
	isLoading: boolean;
	isApplying: boolean;
	callbacks: {
		onGenerate: (_values: GenerateValues) => void | Promise<void>;
		onAccept: () => void | Promise<void>;
		onClose: () => void;
		onSelect: (_id: string) => void;
		onToggleLocale: (_localeCode: string | null | null) => void;
		onEdit: (
			_id: string,
			_localeCode: string | null | null,
			_value: string,
		) => void;
		onRevert: (_id: string, _localeCode: string | null | null) => void;
	};
}> = (props) => {
	// -----------------------------
	// State
	const [instruction, setInstruction] = createSignal("");

	// -----------------------------
	// Memos
	function generationLabel(index: number) {
		return T()("ai.media.alt.generate.response.item.label", {
			count: index + 1,
		});
	}
	const currentSelected = createMemo(() => {
		return (
			props.selectedGenerationId === undefined ||
			props.selectedGenerationId === CURRENT_ALT_ID
		);
	});
	const currentOutput = createMemo(
		() => props.currentAlt ?? new Map<string | null, string>(),
	);
	const activeGeneration = createMemo(() => {
		return props.generations.find(
			(generation) => generation.id === props.selectedGenerationId,
		);
	});
	const activeOutput = createMemo<Map<string | null, string>>(() => {
		if (currentSelected()) return currentOutput();
		return activeGeneration()?.output ?? currentOutput();
	});
	const activeDraftId = createMemo(() => {
		if (currentSelected()) return CURRENT_ALT_ID;
		return activeGeneration()?.id;
	});
	const outputLocales = createMemo(() =>
		props.locales.length ? props.locales : [{ code: null, name: null }],
	);
	const visibleLocales = createMemo(() =>
		outputLocales().filter((locale) =>
			props.selectedLocales.includes(locale.code),
		),
	);
	const hasResponse = createMemo(() => props.generations.length > 0);
	const sessionCost = createMemo(() => {
		const firstGeneration = props.generations[0];
		if (!firstGeneration) return undefined;

		return formatAiCost(
			sumAiCredits(props.generations.map((generation) => generation.cost)),
		);
	});
	const isEdited = (
		generation: MediaAltGenerationCandidate,
		localeCode: string | null,
	) => {
		return (
			generation.output.get(localeCode) !==
			generation.originalOutput.get(localeCode)
		);
	};
	const outputLocaleCount = (output: Map<string | null, string>) => {
		return outputLocales().filter((locale) => output.get(locale.code)).length;
	};
	const localeLabel = (locale: {
		code: string | null;
		name: string | null;
	}) => {
		if (props.locales.length === 0) return T()("common.alt");
		return `${locale.name ?? locale.code} · ${locale.code}`;
	};
	const historyItems = createMemo<AiGenerationHistoryItem[]>(() => [
		{
			id: CURRENT_ALT_ID,
			label: T()("ai.media.alt.generate.history.current"),
			meta: T()("ai.media.alt.generate.response.locale.count", {
				count: outputLocaleCount(currentOutput()),
				total: outputLocales().length,
			}),
		},
		...props.generations.map((generation, index) => ({
			id: generation.id,
			label: generationLabel(index),
			meta:
				formatAiCost(generation.cost) ??
				T()("ai.media.alt.generate.response.locale.count", {
					count: outputLocaleCount(generation.output),
					total: outputLocales().length,
				}),
		})),
	]);
	// -----------------------------
	// Functions
	const setOpen = (open: boolean) => {
		if (!open && props.state.open) props.callbacks.onClose();
		props.state.setOpen(open);
	};
	const generate = (event?: SubmitEvent) => {
		event?.preventDefault();
		if (props.selectedLocales.length === 0) return;

		const trimmedInstruction = instruction().trim();
		void props.callbacks.onGenerate({
			instruction: trimmedInstruction || undefined,
			localeCodes: props.selectedLocales,
		});
	};

	// -----------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setInstruction("");
	});

	// -----------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen,
			}}
			options={{
				size: "large",
				noPadding: true,
			}}
		>
			<div class="grid min-w-0 w-full items-stretch gap-0 md:grid-cols-[minmax(24rem,0.5fr)_minmax(0,1fr)]">
				<form
					class="flex min-h-130 min-w-0 flex-col gap-4 border-b border-border bg-card-base p-4 md:border-r md:border-b-0 md:p-6"
					onSubmit={generate}
				>
					<div class="rectangle-background relative flex min-h-64 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-background-base">
						<Show
							when={props.imageUrl}
							fallback={
								<div class="relative z-10 flex h-full items-center justify-center px-4 text-center text-sm text-body">
									{T()("ai.media.alt.generate.preview.empty")}
								</div>
							}
						>
							{(url) => (
								<img
									src={url()}
									alt=""
									class="relative z-10 h-full max-h-80 w-full object-contain p-2"
								/>
							)}
						</Show>
					</div>
					<Show when={props.locales.length > 1}>
						<div class="min-w-0">
							<Label
								id="ai-media-alt-generation-locales"
								label={T()("ai.media.alt.generate.locales.label")}
								theme="basic"
								hideOptionalText
								rightSlot={
									<span class="text-xs text-unfocused">
										{T()("ai.media.alt.generate.locales.selected", {
											count: props.selectedLocales.length,
										})}
									</span>
								}
							/>
							<div class="flex min-w-0 flex-wrap gap-2">
								<For each={props.locales}>
									{(locale) => {
										const selected = createMemo(() =>
											props.selectedLocales.includes(locale.code),
										);

										return (
											<Pill
												as="button"
												theme={selected() ? "primary-opaque" : "outline"}
												aria-pressed={selected()}
												disabled={props.isLoading || props.isApplying}
												onClick={() =>
													props.callbacks.onToggleLocale(locale.code)
												}
											>
												{locale.name ?? locale.code}
											</Pill>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
					<div>
						<Textarea
							id="ai-media-alt-generation-instruction"
							name="ai-media-alt-generation-instruction"
							value={instruction()}
							onChange={setInstruction}
							onKeyUp={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									generate();
								}
							}}
							copy={{
								label: T()("ai.media.alt.generate.direction.label"),
								placeholder: T()(
									"ai.media.alt.generate.instruction.placeholder",
								),
							}}
							rows={5}
						/>
						<Show when={props.error}>
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
							loading={props.isLoading}
							disabled={
								props.selectedLocales.length === 0 ||
								props.isLoading ||
								props.isApplying
							}
						>
							<FaSolidPaperPlane size={12} aria-hidden="true" />
							{T()("ai.media.alt.generate.modal.generate")}
						</Button>
					</div>
				</form>
				<div class="dotted-background relative flex max-h-[min(86vh,820px)] min-h-130 min-w-0 flex-col self-stretch overflow-hidden px-4 md:px-6">
					<div class="relative min-h-0 min-w-0 flex-1">
						<div class="relative z-10 flex h-full min-h-0 min-w-0 flex-col gap-3 md:grid md:grid-cols-[116px_minmax(0,1fr)] md:gap-4">
							<GenerationHistory
								id="ai-media-alt-generation-history"
								items={historyItems()}
								activeItemId={props.selectedGenerationId}
								onSelect={props.callbacks.onSelect}
								loading={props.isLoading}
								loadingLabel={T()("ai.media.alt.generate.history.generating")}
								loadingMeta={T()(
									"ai.media.alt.generate.history.generating.meta",
								)}
							/>
							<div class="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pt-0 pr-1 pb-0 md:py-6">
								<div class="min-w-0 space-y-3">
									<For each={visibleLocales()}>
										{(locale) => {
											const editableGeneration = createMemo(() => {
												if (currentSelected()) return undefined;
												return activeGeneration();
											});
											const canRevert = createMemo(() => {
												const generation = editableGeneration();
												if (!generation) return false;
												return isEdited(generation, locale.code);
											});
											const value = createMemo(
												() => activeOutput().get(locale.code) ?? "",
											);
											const fieldId = createMemo(
												() =>
													`ai-media-alt-generation-${props.selectedGenerationId ?? CURRENT_ALT_ID}-${locale.code}`,
											);

											return (
												<div class="min-w-0 overflow-hidden rounded-lg border border-border bg-background-base">
													<div class="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
														<label
															for={fieldId()}
															class="min-w-0 truncate text-sm font-medium text-body"
														>
															{localeLabel(locale)}
														</label>
														<Show when={canRevert()}>
															<button
																type="button"
																class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-icon-faded transition-colors duration-200 hover:bg-input-base hover:text-title focus-visible:ring-1 focus-visible:ring-primary-base"
																title={T()(
																	"ai.media.alt.generate.response.revert",
																)}
																aria-label={T()(
																	"ai.media.alt.generate.response.revert",
																)}
																onClick={() => {
																	const generation = editableGeneration();
																	if (!generation) return;

																	props.callbacks.onRevert(
																		generation.id,
																		locale.code,
																	);
																}}
															>
																<FaSolidArrowRotateLeft
																	size={11}
																	aria-hidden="true"
																/>
															</button>
														</Show>
													</div>
													<div class="p-3">
														<Textarea
															id={fieldId()}
															name={fieldId()}
															value={value()}
															onChange={(nextValue) => {
																const draftId = activeDraftId();
																if (!draftId) return;

																props.callbacks.onEdit(
																	draftId,
																	locale.code,
																	nextValue,
																);
															}}
															onBlur={() => {
																const draftId = activeDraftId();
																if (!draftId) return;

																props.callbacks.onSelect(draftId);
															}}
															rows={2}
															noMargin
															hideOptionalText
														/>
													</div>
												</div>
											);
										}}
									</For>
								</div>
							</div>
						</div>
						<Show when={props.isLoading}>
							<div class="absolute inset-0 z-20 flex items-center justify-center bg-background-base/70 p-6 backdrop-blur-sm">
								<div class="flex min-w-0 max-w-xs flex-col items-center gap-3 text-center">
									<span
										class="ai-action-button__surface flex h-11 min-w-11 items-center justify-center rounded-md border border-border text-primary-base"
										data-loading="true"
									>
										<FaSolidMagicWandSparkles size={16} aria-hidden="true" />
									</span>
									<div class="min-w-0 max-w-60">
										<p class="text-sm font-semibold text-title">
											{T()("ai.media.alt.generate.loading")}
										</p>
										<p class="mt-1 text-sm leading-5 text-body">
											{T()(
												"ai.media.alt.generate.response.generating.description",
											)}
										</p>
									</div>
								</div>
							</div>
						</Show>
					</div>
					<div class="relative z-10 -mx-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card-base/95 p-6 backdrop-blur-sm md:-mx-6">
						<div class="min-w-0 flex-1">
							<Show when={sessionCost()}>
								{(cost) => (
									<p class="text-xs text-body">
										{T()("ai.media.image.generate.cost.total", {
											cost: cost(),
										})}
									</p>
								)}
							</Show>
						</div>
						<div class="flex shrink-0 items-center gap-3">
							<Button
								type="button"
								theme="border-outline"
								size="medium"
								onClick={() => setOpen(false)}
							>
								{T()("common.cancel")}
							</Button>
							<Show when={hasResponse() || currentSelected()}>
								<Button
									type="button"
									theme="primary"
									size="medium"
									onClick={() => {
										void props.callbacks.onAccept();
									}}
									disabled={
										props.selectedLocales.length === 0 ||
										props.isLoading ||
										props.isApplying
									}
								>
									{T()("ai.media.alt.generate.modal.accept")}
								</Button>
							</Show>
						</div>
					</div>
				</div>
			</div>
		</Modal>
	);
};

const MediaAltGenerationModal: Component = () => {
	// -----------------------------
	// State
	const [currentAltDraft, setCurrentAltDraft] = createSignal<
		Map<string | null, string>
	>(new Map());
	const [generations, setGenerations] = createSignal<
		MediaAltGenerationCandidate[]
	>([]);
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [selectedLocales, setSelectedLocales] = createSignal<
		Array<string | null>
	>([]);
	const [previewUrl, setPreviewUrl] = createSignal<string>();
	const [clientError, setClientError] = createSignal<string>();
	let generationId = 0;
	let abortController: AbortController | undefined;

	// -----------------------------
	// Mutations
	const generateAlt = api.ai.useMediaAltGenerate();

	// -----------------------------
	// Memos
	const featureEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("altGeneration"),
	);
	const modal = createMemo(() => aiModalsStore.getModal("mediaAltGeneration"));
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const isLoading = createMemo(() => generateAlt.action.isPending);
	const responseError = createMemo(() => {
		return clientError() ?? generateAlt.errors()?.message;
	});
	const selectedGeneration = createMemo(() => {
		return generations().find(
			(generation) => generation.id === selectedGenerationId(),
		);
	});
	const currentSelected = createMemo(() => {
		return (
			selectedGenerationId() === undefined ||
			selectedGenerationId() === CURRENT_ALT_ID
		);
	});
	const activeOutput = createMemo(() => {
		if (currentSelected()) return currentAltDraft();
		return selectedGeneration()?.output ?? currentAltDraft();
	});

	// -----------------------------
	// Functions
	function draftOutput(
		output: Map<string | null, string>,
	): AiGeneratedContent<string> {
		if (output.has(null))
			return { kind: "value", value: output.get(null) ?? "" };
		return { kind: "translations", translations: Object.fromEntries(output) };
	}
	function buildCurrentAltDraft(target: MediaAltGenerationTarget) {
		const output = new Map(
			(target.media().alt ?? []).map((row) => [
				row.localeCode,
				row.value ?? "",
			]),
		);
		const locales = target.locales().length
			? target.locales().map((locale) => locale.code)
			: [null];
		for (const locale of locales)
			if (!output.has(locale)) output.set(locale, "");
		return output;
	}
	function buildGeneratedAlt(
		target: MediaAltGenerationTarget,
		output: Map<string | null, string>,
		targetLocaleCodes: Array<string | null>,
	): MediaTranslation[] {
		const rows = new Map(
			(target.media().alt ?? []).map((row) => [row.localeCode, row.value]),
		);
		for (const locale of targetLocaleCodes)
			rows.set(locale, output.get(locale) ?? null);
		return [...rows].map(([localeCode, value]) => ({ localeCode, value }));
	}

	const abortRequest = () => {
		abortController?.abort();
		abortController = undefined;
	};
	const clear = () => {
		setCurrentAltDraft(new Map());
		setGenerations([]);
		setSelectedGenerationId(undefined);
		setSelectedLocales([]);
		setClientError(undefined);
		generateAlt.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const close = (open: boolean) => {
		if (open) return;

		abortRequest();
		clear();
		aiModalsStore.close();
	};
	const generate = async (
		values: GenerateValues = {},
		requestTarget = target(),
		requestTargetId = targetId(),
		requestLocaleCodes = values.localeCodes ?? selectedLocales(),
	) => {
		const source = requestTarget?.image();
		if (
			!requestTarget ||
			!source ||
			!requestTargetId ||
			requestLocaleCodes.length === 0
		) {
			return;
		}

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			generateAlt.reset();
			aiModalsStore.setLoading(true);

			const preparedImage = await prepareAiImage(source, {
				signal: abortController.signal,
			});
			const media = requestTarget.media();
			const response = await generateAlt.action.mutateAsync({
				signal: abortController.signal,
				shouldToast: () => aiModalsStore.isOpen("mediaAltGeneration"),
				body: {
					instruction: values.instruction,
					previousResponses: generations().map((generation) => ({
						instruction: generation.instruction,
						output: draftOutput(generation.output),
					})),
					image: {
						data: preparedImage.data,
						mimeType: preparedImage.mimeType,
						detail: "low",
						filename: preparedImage.filename,
					},
					media: {
						id: media.id,
						name: mediaGenerationValue(media.name),
						alt: mediaGenerationValue(
							[...activeOutput()].map(([localeCode, value]) => ({
								localeCode,
								value,
							})),
						),
					},
					locale: {
						source:
							getDefaultTranslationLocale(requestTarget.locales()) ?? undefined,
						target: requestLocaleCodes.includes(null)
							? null
							: requestLocaleCodes.filter((locale) => locale !== null),
					},
				},
			});

			if (!isOpen() || targetId() !== requestTargetId) return;

			const id = `${Date.now()}-${generationId}`;
			generationId += 1;
			setGenerations((previous) => [
				...previous,
				{
					id,
					instruction: values.instruction,
					output: new Map(generatedContentEntries(response.data.output)),
					originalOutput: new Map(
						generatedContentEntries(response.data.output),
					),
					cost: response.data.usage.cost,
				},
			]);
			setSelectedGenerationId(id);
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
					: T()("toasts.ai.media.alt.generate.error.message");
			setClientError(message);
			spawnToast({
				title: T()("toasts.ai.media.alt.generate.error.title"),
				message,
				status: "error",
			});
		} finally {
			if (targetId() === requestTargetId) {
				aiModalsStore.setLoading(false);
			}
		}
	};
	const accept = async () => {
		const activeTarget = target();
		const targetLocaleCodes = selectedLocales();
		if (!activeTarget || targetLocaleCodes.length === 0) return;

		try {
			aiModalsStore.setApplying(true);
			await activeTarget.setAlt(
				buildGeneratedAlt(activeTarget, activeOutput(), targetLocaleCodes),
			);
			close(false);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const editAltDraft = (
		id: string,
		localeCode: string | null,
		value: string,
	) => {
		if (id === CURRENT_ALT_ID) {
			setCurrentAltDraft((previous) =>
				new Map(previous).set(localeCode, value),
			);
			return;
		}

		setGenerations((previous) =>
			previous.map((generation) => {
				if (generation.id !== id) return generation;

				return {
					...generation,
					output: new Map(generation.output).set(localeCode, value),
				};
			}),
		);
	};
	const revertGeneration = (id: string, localeCode: string | null) => {
		setGenerations((previous) =>
			previous.map((generation) => {
				if (generation.id !== id) return generation;

				return {
					...generation,
					output: new Map(generation.output).set(
						localeCode,
						generation.originalOutput.get(localeCode) ?? "",
					),
				};
			}),
		);
	};
	const toggleLocale = (localeCode: string | null) => {
		if (isLoading() || aiModalsStore.get.isApplying) return;

		const selected = selectedLocales();
		if (selected.includes(localeCode)) {
			if (selected.length === 1) return;
			setSelectedLocales(selected.filter((item) => item !== localeCode));
			return;
		}

		setSelectedLocales([...selected, localeCode]);
	};

	// -----------------------------
	// Effects
	createEffect(() => {
		if (!featureEnabled() && isOpen()) close(false);
	});

	createEffect(() => {
		const source = target()?.image();
		if (source?.file) {
			const objectUrl = URL.createObjectURL(source.file);
			setPreviewUrl(objectUrl);
			onCleanup(() => URL.revokeObjectURL(objectUrl));
			return;
		}

		setPreviewUrl(source?.url ?? undefined);
	});

	createEffect(
		on(targetId, (id) => {
			const activeTarget = target();
			if (!id || !activeTarget) return;

			clear();
			const localeCodes = activeTarget.locales().length
				? activeTarget.locales().map((locale) => locale.code)
				: [null];
			setCurrentAltDraft(buildCurrentAltDraft(activeTarget));
			setSelectedLocales(localeCodes);
			setSelectedGenerationId(CURRENT_ALT_ID);
			const currentOutput = activeTarget.media().alt;
			if (currentOutput?.some((row) => Boolean(row.value))) {
				return;
			}

			void generate({}, activeTarget, id, localeCodes);
		}),
	);

	onCleanup(() => {
		abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<Show when={featureEnabled()}>
			<MediaAltGenerationModalContent
				state={{
					open: isOpen(),
					setOpen: close,
				}}
				imageUrl={previewUrl()}
				locales={target()?.locales() ?? []}
				selectedLocales={selectedLocales()}
				currentAlt={currentAltDraft()}
				generations={generations()}
				selectedGenerationId={selectedGenerationId()}
				error={responseError()}
				isLoading={isLoading()}
				isApplying={aiModalsStore.get.isApplying}
				callbacks={{
					onGenerate: generate,
					onAccept: accept,
					onClose: () => {
						abortRequest();
						clear();
					},
					onSelect: setSelectedGenerationId,
					onToggleLocale: toggleLocale,
					onEdit: editAltDraft,
					onRevert: revertGeneration,
				}}
			/>
		</Show>
	);
};

export default MediaAltGenerationModal;
