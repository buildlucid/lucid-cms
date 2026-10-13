import type { MediaGenerationType } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import useMediaGeneration from "@/hooks/useMediaGeneration/useMediaGeneration";
import useMediaGenerationSession from "@/hooks/useMediaGenerationSession/useMediaGenerationSession";
import api from "@/services/api";
import aiModalsStore, {
	type AiImageSource,
} from "@/store/aiModalsStore/aiModalsStore";
import T from "@/translations";
import { getBodyError, getErrorObject } from "@/utils/error-helpers";
import AudioGenerationForm from "./parts/AudioGenerationForm";
import CompletedGeneration from "./parts/CompletedGeneration";
import GenerationHistory from "./parts/GenerationHistory";
import GenerationModelPicker from "./parts/GenerationModelPicker";
import ImageGenerationForm from "./parts/ImageGenerationForm";
import PendingGeneration from "./parts/PendingGeneration";
import TypeOption from "./parts/TypeOption";
import type {
	AudioGenerationValues,
	ImageGenerationValues,
	MediaGenerationCandidate,
	MediaImageGenerationSource,
} from "./types";
import {
	generationFileName,
	generationNumber,
	normalizeMimeType,
} from "./utils/generation-helpers";
import { loadStoredPendingMediaGeneration } from "./utils/pending-generation";

/** Generates images or speech for a target, locking the media type when only one is accepted. */
const MediaGenerationModal: Component = () => {
	// -----------------------------
	// State & Hooks
	const mediaGeneration = useMediaGeneration();

	const [type, setType] = createSignal<MediaGenerationType>("image");
	const [modelIds, setModelIds] = createSignal<
		Partial<Record<MediaGenerationType, string>>
	>({});
	const [source, setSource] = createSignal<MediaImageGenerationSource>();
	const [initialSource, setInitialSource] =
		createSignal<MediaImageGenerationSource>();

	let responseColumnRef: HTMLDivElement | undefined;

	// -----------------------------
	// Memos
	const modal = createMemo(() => aiModalsStore.getModal("mediaGeneration"));
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const types = createMemo(() => mediaGeneration.targetTypes(target()));

	// -----------------------------
	// Queries & Mutations
	const models = api.ai.useGetMediaModels({
		type,
		enabled: () => isOpen() && types().includes(type()),
	});
	const session = useMediaGenerationSession({ target, targetId });

	// -----------------------------
	// Memos
	const typeOptions = createMemo(() =>
		types().map((value) => ({
			value,
			label: T()(`ai.media.generate.type.option.${value}`),
		})),
	);
	const model = createMemo(() => modelIds()[type()]);
	const catalog = createMemo(() => models.data?.data);
	const selectedModel = createMemo(() =>
		catalog()?.models.find((option) => option.id === model()),
	);
	const imageModel = createMemo(() => {
		const selected = selectedModel();
		return selected && "aspectRatios" in selected ? selected : undefined;
	});
	const audioModel = createMemo(() => {
		const selected = selectedModel();
		return selected && "voices" in selected ? selected : undefined;
	});
	const responseError = createMemo(
		() =>
			session.clientError() ??
			(type() === "image"
				? session.imageErrors()?.message
				: session.audioErrors()?.message) ??
			(models.isError
				? T()("ai.media.generate.models.unavailable")
				: undefined),
	);
	const imageGenerationErrors = createMemo(() =>
		getErrorObject(getBodyError("generation", session.imageErrors)),
	);
	const hasHistory = createMemo(
		() => session.generations().length > 0 || session.hasPendingGeneration(),
	);

	// -----------------------------
	// Functions
	function setModel(modelId?: string) {
		setModelIds((current) => ({ ...current, [type()]: modelId }));
	}
	function buildTargetSource(
		image?: AiImageSource | null,
	): MediaImageGenerationSource | undefined {
		if (!image?.file && !image?.url) return undefined;

		return {
			id: "target-source",
			type: "target",
			label:
				image.filename ??
				image.file?.name ??
				T()("ai.media.image.generate.source.current"),
			image,
		};
	}
	function buildPreviousInstructions() {
		return session
			.generations()
			.flatMap((generation) =>
				generation.settings.type === "image" &&
				generation.settings.includeInPreviousInstructions &&
				generation.settings.instruction.trim().length > 0
					? [generation.settings.instruction]
					: [],
			)
			.slice(-10);
	}
	const clear = () => {
		session.clear();
		setSource(undefined);
		setInitialSource(undefined);
	};
	const close = (open: boolean) => {
		if (open) return;

		session.abortRequest();
		clear();
		aiModalsStore.close();
	};
	const changeType = (value: MediaGenerationType) => {
		if (value === type()) return;
		setType(value);
		session.resetErrors();
	};
	const useGenerationAsSource = (generation: MediaGenerationCandidate) => {
		if (generation.result.type !== "image") return;

		setSource({
			id: `source-${generation.id}`,
			type: "generation",
			label: T()("ai.media.image.generate.source.generation.label", {
				id: generationNumber(generation.id),
			}),
			image: {
				url: generation.result.output.url,
				filename: generationFileName(generation.result.output),
				mimeType: normalizeMimeType(generation.result.output.mimeType),
			},
		});
	};
	const generateImageFrom = (values: ImageGenerationValues) => {
		const selected = imageModel();
		if (!selected) return;

		const currentSource = selected.sourceImage ? source() : undefined;
		void session.generate({
			...values,
			type: "image",
			model: selected.id,
			modelName: selected.name,
			sourceLabel:
				currentSource?.label ?? T()("ai.media.image.generate.source.none"),
			source: currentSource,
			previousInstructions: buildPreviousInstructions(),
			includeInPreviousInstructions: true,
		});
	};
	const generateAudioFrom = (values: AudioGenerationValues) => {
		const selected = audioModel();
		if (!selected) return;

		void session.generate({
			type: "audio",
			model: selected.id,
			modelName: selected.name,
			script: values.script,
			instruction: values.instruction ?? "",
			voice: values.voice,
			voiceName:
				selected.voices.find((voice) => voice.id === values.voice)?.name ??
				values.voice,
		});
	};
	const retryGeneration = (generation: MediaGenerationCandidate) => {
		void session.generate(
			generation.settings.type === "image"
				? { ...generation.settings, includeInPreviousInstructions: false }
				: generation.settings,
		);
	};
	const accept = async () => {
		if (await session.accept()) close(false);
	};

	// -----------------------------
	// Effects
	createEffect(() => {
		if (isOpen()) session.resetIdempotencyKey();
	});
	createEffect(
		on([type, model], () => session.resetIdempotencyKey(), { defer: true }),
	);
	createEffect(() => {
		const current = catalog();
		if (!current) return;
		if (!current.models.some((option) => option.id === model())) {
			setModel(current.default);
		}
	});
	createEffect(() => {
		if (!isOpen() || !session.selectedGenerationId()) return;

		requestAnimationFrame(() => {
			responseColumnRef?.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		});
	});
	createEffect(() => {
		if (isOpen() && types().length === 0) close(false);
	});
	createEffect(
		on(targetId, (id) => {
			const activeTarget = target();
			if (!id || !activeTarget) return;

			session.abortRequest();
			clear();
			const targetSource = buildTargetSource(activeTarget.image());
			setInitialSource(targetSource);
			setSource(targetSource);

			const storedPending = loadStoredPendingMediaGeneration(id);
			const pendingType = storedPending?.settings.type;
			changeType(
				pendingType && types().includes(pendingType)
					? pendingType
					: (types()[0] ?? "image"),
			);
			if (storedPending && pendingType === type()) {
				session.restorePendingGeneration(storedPending);
			}
		}),
	);

	onCleanup(() => {
		session.abortRequest();
		aiModalsStore.reset();
	});

	// -----------------------------
	// Render
	return (
		<Modal.Root open={isOpen()} onOpenChange={close} size="lg">
			<div class="grid min-w-0 w-full items-stretch gap-0 lg:grid-cols-[minmax(27rem,0.72fr)_minmax(0,1fr)]">
				<div class="flex min-h-130 min-w-0 w-full flex-col border-b border-border bg-card lg:border-r lg:border-b-0">
					<div class="border-b border-border p-4 md:px-6">
						<Select
							id="ai-media-generation-type"
							name="ai-media-generation-type"
							aria-label={T()("ai.media.generate.type.label")}
							value={type()}
							onChange={(value) => {
								const next = types().find((option) => option === value);
								if (next) changeType(next);
							}}
							options={typeOptions()}
							renderValue={({ option }) => (
								<TypeOption type={option.value} label={option.label} />
							)}
							renderOption={({ option }) => (
								<TypeOption type={option.value} label={option.label} />
							)}
							disabled={types().length < 2 || session.hasPendingGeneration()}
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
						{/* both forms stay mounted, so switching type keeps what was typed */}
						<Show when={types().includes("image")}>
							<div
								class="flex min-w-0 flex-col gap-4"
								hidden={type() !== "image"}
							>
								<ImageGenerationForm
									model={imageModel()}
									source={source()}
									initialSource={initialSource()}
									onSourceChange={setSource}
									loading={session.isLoading()}
									disabled={session.hasPendingGeneration() || !imageModel()}
									error={responseError()}
									fieldError={(key) =>
										getErrorObject(imageGenerationErrors()?.[key])
									}
									instructionError={getBodyError(
										"instruction",
										session.imageErrors,
									)}
									modelPicker={
										<GenerationModelPicker
											name="ai-media-image-generation-model"
											models={catalog()?.models}
											value={model()}
											onSelect={setModel}
											loading={models.isFetching && !models.isSuccess}
											error={models.isError}
											onRetry={() => void models.refetch()}
											disabled={session.isLoading()}
										/>
									}
									onChange={session.resetIdempotencyKey}
									onGenerate={generateImageFrom}
								/>
							</div>
						</Show>
						<Show when={types().includes("audio")}>
							<div
								class="flex min-w-0 flex-col gap-4"
								hidden={type() !== "audio"}
							>
								<AudioGenerationForm
									model={audioModel()}
									loading={session.isLoading()}
									disabled={session.hasPendingGeneration()}
									error={responseError()}
									scriptError={getBodyError("script", session.audioErrors)}
									modelPicker={
										<GenerationModelPicker
											name="ai-media-audio-generation-model"
											models={catalog()?.models}
											value={model()}
											onSelect={setModel}
											loading={models.isFetching && !models.isSuccess}
											error={models.isError}
											onRetry={() => void models.refetch()}
											disabled={session.isLoading()}
										/>
									}
									onChange={session.resetIdempotencyKey}
									onGenerate={generateAudioFrom}
								/>
							</div>
						</Show>
					</div>
				</div>
				<div class="dotted-background relative min-h-130 min-w-0 overflow-hidden">
					{/* On large screens, fill the row without increasing its height so the footer stays at the modal bottom. */}
					<div class="flex min-h-130 min-w-0 flex-col px-4 max-lg:max-h-[min(86vh,820px)] md:px-6 lg:absolute lg:inset-0 lg:min-h-0">
						<div class="relative min-h-0 min-w-0 flex-1">
							<div
								class={
									hasHistory()
										? "relative z-10 flex h-full min-h-0 min-w-0 flex-col gap-3 md:grid md:grid-cols-[116px_minmax(0,1fr)] md:gap-4"
										: "relative z-10 flex h-full min-h-0 min-w-0 flex-col"
								}
							>
								<GenerationHistory
									generations={session.generations()}
									working={session.workingGeneration()}
									pending={session.pendingGeneration()}
									polling={session.isPollingCompletion()}
									activeItemId={session.selectedGenerationId()}
									onSelect={session.selectGeneration}
								/>
								<div
									ref={responseColumnRef}
									class="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pt-0 pr-1 pb-0 md:py-6"
								>
									<Show
										when={session.selectedWorkingGeneration()}
										fallback={
											<Show when={session.selectedGeneration()}>
												{(generation) => (
													<CompletedGeneration
														generation={generation()}
														loading={session.isLoading()}
														onRetry={() => retryGeneration(generation())}
														onUseAsSource={
															generation().result.type === "image" &&
															type() === "image" &&
															imageModel()?.sourceImage
																? () => useGenerationAsSource(generation())
																: undefined
														}
													/>
												)}
											</Show>
										}
									>
										{(working) => (
											<PendingGeneration
												generation={working()}
												loading={session.isLoading()}
												resumable={
													session.resumableSelectedPendingGeneration() !==
													undefined
												}
												onResume={session.resumePendingGeneration}
												onDiscard={session.discardPendingGeneration}
											/>
										)}
									</Show>
								</div>
							</div>
						</div>
						<div class="relative z-10 -mx-4 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-card/95 p-6 backdrop-blur-sm md:-mx-6">
							<div class="flex shrink-0 items-center gap-3">
								<Button
									type="button"
									variant="outline"
									size="md"
									onClick={() => close(false)}
								>
									{T()("common.cancel")}
								</Button>
								<Button
									type="button"
									variant="primary"
									size="md"
									onClick={() => {
										void accept();
									}}
									loading={aiModalsStore.get.isApplying}
									disabled={
										!session.selectedGeneration() || session.isLoading()
									}
								>
									{T()("ai.media.generate.modal.accept")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Modal.Root>
	);
};

export default MediaGenerationModal;
