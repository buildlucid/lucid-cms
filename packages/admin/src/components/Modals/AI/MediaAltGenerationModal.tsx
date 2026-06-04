import type { Locale, Media } from "@types";
import classnames from "classnames";
import { FaSolidArrowRotateLeft, FaSolidPaperPlane } from "solid-icons/fa";
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
import { Label } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import aiModalsStore, {
	type MediaAltGenerationTarget,
} from "@/store/aiModalsStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";
import {
	getDefaultTranslationLocale,
	type TranslationValue,
} from "@/utils/translation-helpers";

type GenerateValues = {
	instruction?: string;
};

const CURRENT_ALT_ID = "current-alt";

export type MediaAltGenerationCandidate = {
	id: string;
	instruction?: string;
	output: Record<string, string>;
	originalOutput: Record<string, string>;
};

interface MediaAltGenerationModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	imageUrl?: string;
	locales: Locale[];
	currentAlt?: Record<string, string>;
	generations: MediaAltGenerationCandidate[];
	selectedGenerationId?: string;
	error?: string;
	isLoading: boolean;
	callbacks: {
		onGenerate: (_values: GenerateValues) => void | Promise<void>;
		onAccept: () => void | Promise<void>;
		onClose: () => void;
		onSelect: (_id: string) => void;
		onEdit: (_id: string, _localeCode: string, _value: string) => void;
		onRevert: (_id: string, _localeCode: string) => void;
	};
}

const MediaAltGenerationModalContent: Component<
	MediaAltGenerationModalProps
> = (props) => {
	// -----------------------------
	// State
	const [instruction, setInstruction] = createSignal("");

	// -----------------------------
	// Memos
	const hasCurrentAlt = createMemo(() => {
		return Object.keys(props.currentAlt ?? {}).length > 0;
	});
	const currentSelected = createMemo(() => {
		return props.selectedGenerationId === CURRENT_ALT_ID;
	});
	const currentOutput = createMemo(() => props.currentAlt ?? {});
	const hasResponse = createMemo(() => props.generations.length > 0);
	const hasContent = createMemo(() => hasCurrentAlt() || hasResponse());
	const hasInstruction = createMemo(() => instruction().trim().length > 0);
	const responseStatus = createMemo(() => {
		if (props.isLoading) return T()("ai.generation.loading");
		if (hasResponse()) {
			return T()("ai.media.alt.generate.response.history.count", {
				count: props.generations.length,
				total: props.locales.length,
			});
		}
		if (hasCurrentAlt()) {
			return T()("ai.media.alt.generate.response.current.available");
		}
		return T()("ai.media.alt.generate.response.waiting");
	});
	const isEdited = (
		generation: MediaAltGenerationCandidate,
		localeCode: string,
	) => {
		return (
			generation.output[localeCode] !== generation.originalOutput[localeCode]
		);
	};
	const generationLabel = (index: number) => {
		return T()("ai.media.alt.generate.response.item.label", {
			count: index + 1,
		});
	};
	const generationSnippet = (generation: MediaAltGenerationCandidate) => {
		return outputSnippet(generation.output);
	};
	const outputSnippet = (output: Record<string, string>) => {
		return (
			output[props.locales[0]?.code] ??
			Object.values(output)[0] ??
			T()("common.empty")
		);
	};
	const outputLocaleCount = (output: Record<string, string>) => {
		return props.locales.filter((locale) => output[locale.code]).length;
	};

	// -----------------------------
	// Functions
	const setOpen = (open: boolean) => {
		if (!open && props.state.open) props.callbacks.onClose();
		props.state.setOpen(open);
	};
	const generate = (event?: SubmitEvent) => {
		event?.preventDefault();
		const trimmedInstruction = instruction().trim();
		if (trimmedInstruction.length === 0) return;
		void props.callbacks.onGenerate({
			instruction: trimmedInstruction,
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
			<div class="min-w-0 px-4 py-4 md:px-6 md:py-5 border-b border-border">
				<h2>{T()("ai.media.alt.generate.modal.title")}</h2>
				<p class="mt-1 text-sm text-body">
					{T()("ai.media.alt.generate.modal.description")}
				</p>
			</div>
			<div class="grid min-w-0 w-full gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<div class="relative min-h-130 min-w-0 w-full overflow-hidden border-b border-border bg-card-base md:border-b-0 md:border-r">
					<div class="absolute inset-x-0 top-0 bottom-10">
						<div class="rectangle-background relative flex h-full w-full items-center justify-center overflow-hidden bg-card-base">
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
										class="relative z-10 h-full w-full object-contain"
									/>
								)}
							</Show>
						</div>
					</div>
					<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-linear-to-t from-background-base via-background-base/85 to-transparent" />
					<form
						class="absolute inset-x-4 bottom-4 z-20 min-w-0 md:inset-x-6 md:bottom-6"
						onSubmit={generate}
					>
						<Label
							id="ai-media-alt-generation-instruction"
							label={T()("ai.generation.instruction.label")}
							theme="basic"
							hideOptionalText
						/>
						<div class="relative min-w-0">
							<textarea
								id="ai-media-alt-generation-instruction"
								name="ai-media-alt-generation-instruction"
								value={instruction()}
								onInput={(event) => setInstruction(event.currentTarget.value)}
								onKeyDown={(event) => {
									event.stopPropagation();
									if (
										(event.metaKey || event.ctrlKey) &&
										event.key === "Enter"
									) {
										generate();
									}
								}}
								placeholder={T()(
									"ai.media.alt.generate.instruction.placeholder",
								)}
								rows={4}
								class="block min-w-0 max-w-full w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 pr-12 text-sm font-medium text-white outline-hidden backdrop-blur-sm transition-colors duration-200 placeholder:text-white/50 hover:border-white/20 focus:border-primary-base focus:bg-black/30"
							/>
							<button
								type="submit"
								class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-md bg-secondary-base text-secondary-contrast transition-colors duration-200 hover:bg-secondary-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-70"
								disabled={props.isLoading || !hasInstruction()}
								title={
									hasResponse()
										? T()("ai.media.alt.generate.modal.try.again")
										: T()("ai.media.alt.generate.modal.generate")
								}
								aria-label={
									hasResponse()
										? T()("ai.media.alt.generate.modal.try.again")
										: T()("ai.media.alt.generate.modal.generate")
								}
							>
								<Show when={!props.isLoading} fallback={<Spinner size="sm" />}>
									<FaSolidPaperPlane size={13} aria-hidden="true" />
								</Show>
							</button>
						</div>
					</form>
				</div>
				<div class="relative flex min-h-130 min-w-0 w-full flex-col p-4 md:p-6">
					<div class="flex min-w-0 shrink-0 items-start justify-between gap-4">
						<div class="min-w-0">
							<h3 class="text-sm font-medium text-title">
								{T()("ai.media.alt.generate.response.title")}
							</h3>
							<p class="mt-1 text-xs text-body">{responseStatus()}</p>
						</div>
						<Button
							type="button"
							theme="secondary"
							size="small"
							onClick={() => {
								void props.callbacks.onGenerate({});
							}}
							loading={props.isLoading}
						>
							{hasResponse()
								? T()("ai.media.alt.generate.modal.try.again")
								: T()("ai.media.alt.generate.modal.generate")}
						</Button>
					</div>
					<div class="mt-4 min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
						<Show
							when={hasContent()}
							fallback={
								<div class="min-w-0 rounded-md border border-dashed border-border bg-card-base p-5">
									<Show
										when={props.error}
										fallback={
											<p class="text-sm text-body">
												{T()("ai.media.alt.generate.response.empty")}
											</p>
										}
									>
										{(error) => (
											<p class="text-sm text-error-base">{error()}</p>
										)}
									</Show>
								</div>
							}
						>
							<div class="min-w-0 space-y-2">
								<Show when={hasCurrentAlt()}>
									<div
										class={classnames(
											"min-w-0 rounded-md border bg-card-base transition-colors duration-200",
											{
												"border-primary-muted-border": currentSelected(),
												"border-border hover:border-primary-muted-border":
													!currentSelected(),
											},
										)}
									>
										<button
											type="button"
											class="flex min-w-0 w-full items-center justify-between gap-3 p-3 text-left"
											onClick={() => props.callbacks.onSelect(CURRENT_ALT_ID)}
										>
											<div class="min-w-0 flex-1">
												<p class="text-sm font-semibold text-title">
													{T()("ai.media.alt.generate.response.current.title")}
												</p>
												<Show when={!currentSelected()}>
													<p class="mt-1 truncate text-xs text-body">
														{outputSnippet(currentOutput())}
													</p>
												</Show>
											</div>
											<span class="shrink-0 text-xs font-medium text-unfocused">
												{T()("ai.media.alt.generate.response.locale.count", {
													count: outputLocaleCount(currentOutput()),
													total: props.locales.length,
												})}
											</span>
										</button>
										<Show when={currentSelected()}>
											<div class="min-w-0 space-y-2 border-t border-border p-3 pt-2">
												<For each={props.locales}>
													{(locale) => (
														<div class="min-w-0">
															<div class="mb-1.5 flex min-w-0 items-center gap-2 text-sm text-body">
																<span class="truncate text-sm text-body">
																	{locale.name ?? locale.code}
																</span>
																<span class="text-sm text-body">·</span>
																<span class="text-sm text-body">
																	{locale.code}
																</span>
															</div>
															<p class="min-h-10 rounded-md border border-border bg-background-base p-2 text-sm leading-5 text-body">
																{currentOutput()[locale.code] ??
																	T()("common.empty")}
															</p>
														</div>
													)}
												</For>
											</div>
										</Show>
									</div>
								</Show>
								<For each={props.generations}>
									{(generation, index) => {
										const selected = createMemo(() => {
											return generation.id === props.selectedGenerationId;
										});

										return (
											<div
												class={classnames(
													"min-w-0 rounded-md border bg-card-base transition-colors duration-200",
													{
														"border-primary-muted-border": selected(),
														"border-border hover:border-primary-muted-border":
															!selected(),
													},
												)}
											>
												<button
													type="button"
													class="flex min-w-0 w-full items-center justify-between gap-3 p-3 text-left"
													onClick={() =>
														props.callbacks.onSelect(generation.id)
													}
												>
													<div class="min-w-0 flex-1">
														<div class="flex items-center gap-2">
															<p class="text-sm font-semibold text-title">
																{generationLabel(index())}
															</p>
														</div>
														<Show when={!selected()}>
															<p class="mt-1 truncate text-xs text-body">
																{generationSnippet(generation)}
															</p>
														</Show>
													</div>
													<span class="shrink-0 text-xs font-medium text-unfocused">
														{T()(
															"ai.media.alt.generate.response.locale.count",
															{
																count: props.locales.filter(
																	(locale) => generation.output[locale.code],
																).length,
																total: props.locales.length,
															},
														)}
													</span>
												</button>
												<Show when={selected()}>
													<div class="min-w-0 space-y-2 border-t border-border p-3 pt-2">
														<For each={props.locales}>
															{(locale) => {
																const fieldId = `ai-media-alt-generation-${generation.id}-${locale.code}`;

																return (
																	<div class="min-w-0">
																		<div class="mb-1.5 flex min-w-0 items-center justify-between gap-2 text-sm text-body">
																			<label
																				for={fieldId}
																				class="flex min-w-0 items-center gap-2 text-sm text-body"
																			>
																				<span class="truncate text-sm text-body">
																					{locale.name ?? locale.code}
																				</span>
																				<span class="text-sm text-body">·</span>
																				<span class="text-sm text-body">
																					{locale.code}
																				</span>
																			</label>
																			<Show
																				when={isEdited(generation, locale.code)}
																			>
																				<button
																					type="button"
																					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-icon-fade transition-colors duration-200 hover:bg-input-base hover:text-title focus-visible:ring-1 focus-visible:ring-primary-base"
																					title={T()(
																						"ai.media.alt.generate.response.revert",
																					)}
																					aria-label={T()(
																						"ai.media.alt.generate.response.revert",
																					)}
																					onClick={() =>
																						props.callbacks.onRevert(
																							generation.id,
																							locale.code,
																						)
																					}
																				>
																					<FaSolidArrowRotateLeft
																						size={11}
																						aria-hidden="true"
																					/>
																				</button>
																			</Show>
																		</div>
																		<textarea
																			id={fieldId}
																			value={
																				generation.output[locale.code] ?? ""
																			}
																			onInput={(event) =>
																				props.callbacks.onEdit(
																					generation.id,
																					locale.code,
																					event.currentTarget.value,
																				)
																			}
																			onFocus={() =>
																				props.callbacks.onSelect(generation.id)
																			}
																			onKeyDown={(event) =>
																				event.stopPropagation()
																			}
																			rows={2}
																			class="block min-w-0 max-w-full w-full resize-none rounded-md border border-border bg-background-base p-2 text-sm leading-5 text-body outline-hidden transition-colors duration-200 focus:border-primary-base"
																		/>
																	</div>
																);
															}}
														</For>
													</div>
												</Show>
											</div>
										);
									}}
								</For>
							</div>
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
						onClick={() => setOpen(false)}
					>
						{T()("common.cancel")}
					</Button>
				</div>
				<div class="flex items-center gap-2">
					<Show when={props.selectedGenerationId === CURRENT_ALT_ID}>
						<Button
							type="button"
							theme="primary"
							size="medium"
							onClick={() => setOpen(false)}
							disabled={props.isLoading}
						>
							{T()("ai.media.alt.generate.modal.keep.current")}
						</Button>
					</Show>
					<Show
						when={
							hasResponse() && props.selectedGenerationId !== CURRENT_ALT_ID
						}
					>
						<Button
							type="button"
							theme="primary"
							size="medium"
							onClick={() => {
								void props.callbacks.onAccept();
							}}
							disabled={props.isLoading}
						>
							{T()("ai.media.alt.generate.modal.accept")}
						</Button>
					</Show>
				</div>
			</ModalFooter>
		</Modal>
	);
};

const MediaAltGenerationModal: Component = () => {
	// -----------------------------
	// State
	const [generations, setGenerations] = createSignal<
		MediaAltGenerationCandidate[]
	>([]);
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [previewUrl, setPreviewUrl] = createSignal<string>();
	const [clientError, setClientError] = createSignal<string>();
	let generationId = 0;
	let abortController: AbortController | undefined;

	// -----------------------------
	// Mutations
	const generateAlt = api.ai.useMediaAltGenerate();

	// -----------------------------
	// Memos
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
	const currentAlt = createMemo(() => {
		return translationsToRecord(target()?.media().alt);
	});

	// -----------------------------
	// Functions
	function translationsToRecord(translations?: TranslationValue[]) {
		if (!translations) return undefined;

		const record = translations.reduce<Record<string, string>>(
			(accumulator, translation) => {
				if (!translation.localeCode || !translation.value) return accumulator;
				accumulator[translation.localeCode] = translation.value;
				return accumulator;
			},
			{},
		);

		return Object.keys(record).length > 0 ? record : undefined;
	}
	function buildGeneratedAlt(
		target: MediaAltGenerationTarget,
		output: Record<string, string>,
	) {
		const previousRows = target.media().alt ?? [];
		const localeRows =
			target.locales().length > 0
				? target.locales().map((locale) => locale.code)
				: Object.keys(output);

		return localeRows.map((localeCode) => {
			const existing = previousRows.find(
				(translation) => translation.localeCode === localeCode,
			);

			return {
				localeCode,
				value: output[localeCode] ?? existing?.value ?? null,
			};
		}) as Media["alt"];
	}
	const abortRequest = () => {
		abortController?.abort();
		abortController = undefined;
	};
	const clear = () => {
		setGenerations([]);
		setSelectedGenerationId(undefined);
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
		values: { instruction?: string } = {},
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		const source = requestTarget?.image();
		if (!requestTarget || !source || !requestTargetId) return;

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
						output: generation.output,
					})),
					image: {
						data: preparedImage.data,
						mimeType: preparedImage.mimeType,
						detail: "low",
						filename: preparedImage.filename,
					},
					media: {
						id: media.id,
						name: translationsToRecord(media.name),
						alt: translationsToRecord(media.alt),
					},
					locale: {
						source: getDefaultTranslationLocale(requestTarget.locales()),
						target: requestTarget.locales().map((locale) => locale.code),
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
					output: { ...response.data.output },
					originalOutput: { ...response.data.output },
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
		const generation = selectedGeneration();
		if (!activeTarget || !generation) return;

		try {
			aiModalsStore.setApplying(true);
			await activeTarget.setAlt(
				buildGeneratedAlt(activeTarget, generation.output),
			);
			close(false);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const editGeneration = (id: string, localeCode: string, value: string) => {
		setGenerations((previous) =>
			previous.map((generation) => {
				if (generation.id !== id) return generation;

				return {
					...generation,
					output: {
						...generation.output,
						[localeCode]: value,
					},
				};
			}),
		);
	};
	const revertGeneration = (id: string, localeCode: string) => {
		setGenerations((previous) =>
			previous.map((generation) => {
				if (generation.id !== id) return generation;

				return {
					...generation,
					output: {
						...generation.output,
						[localeCode]: generation.originalOutput[localeCode] ?? "",
					},
				};
			}),
		);
	};

	// -----------------------------
	// Effects
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
			const currentOutput = translationsToRecord(activeTarget.media().alt);
			if (currentOutput && Object.keys(currentOutput).length > 0) {
				setSelectedGenerationId(CURRENT_ALT_ID);
				return;
			}

			void generate({}, activeTarget, id);
		}),
	);

	onCleanup(() => {
		abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<MediaAltGenerationModalContent
			state={{
				open: isOpen(),
				setOpen: close,
			}}
			imageUrl={previewUrl()}
			locales={target()?.locales() ?? []}
			currentAlt={currentAlt()}
			generations={generations()}
			selectedGenerationId={selectedGenerationId()}
			error={responseError()}
			isLoading={isLoading() || aiModalsStore.get.isApplying}
			callbacks={{
				onGenerate: generate,
				onAccept: accept,
				onClose: () => {
					abortRequest();
					clear();
				},
				onSelect: setSelectedGenerationId,
				onEdit: editGeneration,
				onRevert: revertGeneration,
			}}
		/>
	);
};

export default MediaAltGenerationModal;
