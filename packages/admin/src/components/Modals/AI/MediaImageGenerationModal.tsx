import type { MediaImageGenerateResponse } from "@types";
import classnames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidArrowUpFromBracket,
	FaSolidImage,
	FaSolidXmark,
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
import { Select } from "@/components/Groups/Form/Select";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import api from "@/services/api";
import type {
	MediaImageGenerateBody,
	MediaImageGenerationOutputFormat,
	MediaImageGenerationQuality,
	MediaImageGenerationSize,
} from "@/services/api/ai/useMediaImageGenerate";
import aiModalsStore, { type AiImageSource } from "@/store/aiModalsStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import formatAiCost from "@/utils/format-ai-cost";
import helpers from "@/utils/helpers";
import spawnToast from "@/utils/spawn-toast";

type SupportedImageMimeType = "image/webp" | "image/png" | "image/jpeg";

type GenerateValues = {
	instruction: string;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
};

type GenerateOptions = {
	source?: MediaImageGenerationSource;
	previousInstructions?: string[];
	includeInPreviousInstructions?: boolean;
};

type MediaImageGenerationSource = {
	id: string;
	type: "target" | "upload" | "generation";
	label: string;
	image: AiImageSource;
};

export type MediaImageGenerationCandidate = {
	id: string;
	instruction: string;
	sourceLabel?: string;
	source?: MediaImageGenerationSource;
	previousInstructions: string[];
	includeInPreviousInstructions: boolean;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
	cost: MediaImageGenerateResponse["usage"]["cost"];
	output: MediaImageGenerateResponse["output"];
};

const MediaImageGenerationModal: Component = () => {
	// -----------------------------
	// State
	const [generations, setGenerations] = createSignal<
		MediaImageGenerationCandidate[]
	>([]);
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [source, setSource] = createSignal<MediaImageGenerationSource>();
	const [initialSource, setInitialSource] =
		createSignal<MediaImageGenerationSource>();
	const [sourcePreviewUrl, setSourcePreviewUrl] = createSignal<string>();
	const [clientError, setClientError] = createSignal<string>();
	const [instruction, setInstruction] = createSignal("");
	const [size, setSize] = createSignal<MediaImageGenerationSize>("1024x1024");
	const [quality, setQuality] =
		createSignal<MediaImageGenerationQuality>("medium");
	const [outputFormat, setOutputFormat] =
		createSignal<MediaImageGenerationOutputFormat>("webp");
	let responseColumnRef: HTMLDivElement | undefined;
	let sourceInputRef: HTMLInputElement | undefined;
	let generationId = 0;
	let abortController: AbortController | undefined;

	// -----------------------------
	// Mutations
	const generateImage = api.ai.useMediaImageGenerate();

	// -----------------------------
	// Memos
	const modal = createMemo(() =>
		aiModalsStore.getModal("mediaImageGeneration"),
	);
	const target = createMemo(() => modal()?.data.target);
	const targetId = createMemo(() => modal()?.data.targetId);
	const isOpen = createMemo(() => modal() !== undefined);
	const isLoading = createMemo(() => generateImage.action.isPending);
	const responseError = createMemo(() => {
		return clientError() ?? generateImage.errors()?.message;
	});
	const selectedGeneration = createMemo(() => {
		return generations().find(
			(generation) => generation.id === selectedGenerationId(),
		);
	});
	const hasInstruction = createMemo(() => instruction().trim().length > 0);
	const selectedPreviewUrl = createMemo(() => selectedGeneration()?.output.url);
	const sessionCost = createMemo(() => {
		const firstGeneration = generations()[0];
		if (!firstGeneration) return undefined;

		const currency = firstGeneration.cost.currency;
		const totalCostMinor = generations()
			.filter((generation) => generation.cost.currency === currency)
			.reduce((total, generation) => total + generation.cost.totalCostMinor, 0);

		return formatAiCost({ currency, totalCostMinor });
	});

	// -----------------------------
	// Functions
	function normalizeMimeType(mimeType?: string): SupportedImageMimeType {
		if (
			mimeType === "image/webp" ||
			mimeType === "image/png" ||
			mimeType === "image/jpeg"
		) {
			return mimeType;
		}
		return "image/webp";
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
	function generationFileName(output: MediaImageGenerateResponse["output"]) {
		const extension = output.extension || output.outputFormat || "webp";
		return `lucid-ai-image-${output.id}.${extension.replace(/^\./, "")}`;
	}
	function generationSourceLabel(generation: MediaImageGenerationCandidate) {
		return T()("ai.media.image.generate.source.generation.label", {
			id: generation.id.replace("generation-", ""),
		});
	}
	function sourceDescription(currentSource?: MediaImageGenerationSource) {
		if (!currentSource) return T()("ai.media.image.generate.source.none");
		return currentSource.label;
	}
	function generationLabel(index: number) {
		return T()("ai.media.image.generate.response.item.label", {
			count: index + 1,
		});
	}
	function generationMeta(generation: MediaImageGenerationCandidate) {
		return [
			generation.output.size,
			generation.output.quality,
			helpers.bytesToSize(generation.output.byteSize),
			generationFormatLabel(generation.output.outputFormat),
		]
			.filter(Boolean)
			.join(" · ");
	}
	function generationFormatLabel(
		format: MediaImageGenerationOutputFormat | string,
	) {
		switch (format) {
			case "webp":
				return T()("ai.media.image.generate.format.option.webp");
			case "png":
				return T()("ai.media.image.generate.format.option.png");
			case "jpeg":
				return T()("ai.media.image.generate.format.option.jpeg");
			default:
				return format;
		}
	}
	function submitGenerate(event?: SubmitEvent) {
		event?.preventDefault();
		const trimmedInstruction = instruction().trim();
		if (trimmedInstruction.length === 0) return;

		void generateImageRequest({
			instruction: trimmedInstruction,
			size: size(),
			quality: quality(),
			outputFormat: outputFormat(),
		});
	}
	function selectSourceFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadSource(file);
		input.value = "";
	}
	function buildPreviousInstructions() {
		return generations()
			.filter((generation) => generation.includeInPreviousInstructions)
			.map((generation) => generation.instruction)
			.slice(-10);
	}
	async function buildRequestImage(
		currentSource: MediaImageGenerationSource | undefined,
		signal: AbortSignal,
	): Promise<MediaImageGenerateBody["image"]> {
		if (!currentSource) return undefined;

		if (currentSource.type === "generation" && currentSource.image.url) {
			return {
				type: "url",
				url: currentSource.image.url,
				detail: "auto",
				filename: currentSource.image.filename,
				mimeType: normalizeMimeType(currentSource.image.mimeType),
			};
		}

		const prepared = await prepareAiImage(currentSource.image, {
			maxEdge: 1536,
			quality: 0.9,
			signal,
		});

		return {
			type: "base64",
			data: prepared.data,
			mimeType: prepared.mimeType,
			detail: "auto",
			filename: prepared.filename,
		};
	}
	const abortRequest = () => {
		abortController?.abort();
		abortController = undefined;
	};
	const clear = () => {
		setGenerations([]);
		setSelectedGenerationId(undefined);
		setSource(undefined);
		setInitialSource(undefined);
		setClientError(undefined);
		generateImage.reset();
		aiModalsStore.setLoading(false);
		aiModalsStore.setApplying(false);
	};
	const close = (open: boolean) => {
		if (open) return;

		abortRequest();
		clear();
		aiModalsStore.close();
	};
	const uploadSource = (file: File) => {
		if (!file.type.startsWith("image/")) {
			setClientError(T()("ai.media.image.generate.source.invalid"));
			return;
		}

		setClientError(undefined);
		setSource({
			id: `upload-source-${Date.now()}`,
			type: "upload",
			label: file.name,
			image: {
				file,
				filename: file.name,
				mimeType: normalizeMimeType(file.type),
			},
		});
	};
	const useGenerationAsSource = (generation: MediaImageGenerationCandidate) => {
		setSource({
			id: `source-${generation.id}`,
			type: "generation",
			label: generationSourceLabel(generation),
			image: {
				url: generation.output.url,
				filename: generationFileName(generation.output),
				mimeType: normalizeMimeType(generation.output.mimeType),
			},
		});
	};
	const restoreSource = () => {
		const targetSource = initialSource();
		if (!targetSource) return;
		setSource(targetSource);
	};
	const generateImageRequest = async (
		values: GenerateValues,
		options: GenerateOptions = {},
		requestTarget = target(),
		requestTargetId = targetId(),
	) => {
		if (!requestTarget || !requestTargetId) return;

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			generateImage.reset();
			aiModalsStore.setLoading(true);

			const requestSource = options.source ?? source();
			const image = await buildRequestImage(
				requestSource,
				abortController.signal,
			);
			const previousInstructions =
				options.previousInstructions ?? buildPreviousInstructions();
			const response = await generateImage.action.mutateAsync({
				signal: abortController.signal,
				shouldToast: () => aiModalsStore.isOpen("mediaImageGeneration"),
				body: {
					instruction: values.instruction,
					previousInstructions:
						previousInstructions.length > 0 ? previousInstructions : undefined,
					image,
					generation: {
						size: values.size,
						quality: values.quality,
						outputFormat: values.outputFormat,
					},
				},
			});
			if (!aiModalsStore.isOpen("mediaImageGeneration")) return;

			const id = `generation-${generationId + 1}`;
			generationId += 1;
			const candidate: MediaImageGenerationCandidate = {
				id,
				instruction: values.instruction,
				sourceLabel: sourceDescription(requestSource),
				source: requestSource,
				previousInstructions,
				includeInPreviousInstructions:
					options.includeInPreviousInstructions ?? true,
				size: values.size,
				quality: values.quality,
				outputFormat: values.outputFormat,
				cost: response.data.usage.cost,
				output: response.data.output,
			};

			setGenerations((previous) => [...previous, candidate]);
			setSelectedGenerationId(id);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof LucidError
					? error.message
					: error instanceof Error
						? error.message
						: T()("toasts.ai.media.image.generate.error.message");
			setClientError(message);
			if (
				!(error instanceof LucidError) &&
				aiModalsStore.isOpen("mediaImageGeneration")
			) {
				spawnToast({
					title: T()("toasts.ai.media.image.generate.error.title"),
					message,
					status: "error",
				});
			}
		} finally {
			if (requestTargetId === targetId()) {
				aiModalsStore.setLoading(false);
				abortController = undefined;
			}
		}
	};
	const retryGeneration = (generation: MediaImageGenerationCandidate) => {
		void generateImageRequest(
			{
				instruction: generation.instruction,
				size: generation.size,
				quality: generation.quality,
				outputFormat: generation.outputFormat,
			},
			{
				source: generation.source,
				previousInstructions: generation.previousInstructions,
				includeInPreviousInstructions: false,
			},
		);
	};
	const accept = async (requestTarget = target()) => {
		const generation = selectedGeneration();
		if (!generation || !requestTarget) return;

		try {
			abortRequest();
			abortController = new AbortController();
			setClientError(undefined);
			aiModalsStore.setApplying(true);

			const response = await fetch(generation.output.url, {
				signal: abortController.signal,
			});
			if (!response.ok) {
				throw new Error(T()("ai.media.image.generate.accept.download.failed"));
			}

			const blob = await response.blob();
			const file = new File([blob], generationFileName(generation.output), {
				type: blob.type || generation.output.mimeType || "image/webp",
			});

			await requestTarget.setFile(file);
			close(false);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;

			const message =
				error instanceof Error
					? error.message
					: T()("ai.media.image.generate.accept.download.failed");
			setClientError(message);
			spawnToast({
				title: T()("toasts.ai.media.image.generate.accept.error.title"),
				message,
				status: "error",
			});
		} finally {
			aiModalsStore.setApplying(false);
			abortController = undefined;
		}
	};

	// -----------------------------
	// Effects
	createEffect(() => {
		if (!isOpen()) return;
		setInstruction("");
		setSize("1024x1024");
		setQuality("medium");
		setOutputFormat("webp");
	});

	createEffect(() => {
		if (!isOpen() || !selectedGenerationId()) return;

		requestAnimationFrame(() => {
			responseColumnRef?.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		});
	});

	createEffect(() => {
		const currentSource = source();
		if (currentSource?.image.file) {
			const objectUrl = URL.createObjectURL(currentSource.image.file);
			setSourcePreviewUrl(objectUrl);
			onCleanup(() => URL.revokeObjectURL(objectUrl));
			return;
		}

		setSourcePreviewUrl(currentSource?.image.url ?? undefined);
	});

	createEffect(
		on(targetId, (id) => {
			const activeTarget = target();
			if (!id || !activeTarget) return;

			clear();
			const targetSource = buildTargetSource(activeTarget.image());
			setInitialSource(targetSource);
			setSource(targetSource);
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
					<h2>{T()("ai.media.image.generate.modal.title")}</h2>
					<p class="mt-1 text-sm text-body">
						{T()("ai.media.image.generate.modal.description")}
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
			<div class="grid min-w-0 w-full gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<div class="flex min-h-130 min-w-0 w-full flex-col gap-4 border-b border-border bg-card-base p-4 lg:border-b-0 lg:border-r md:p-6">
					<div class="min-w-0">
						<div class="mb-1.5 flex items-center justify-between gap-2">
							<span class="text-sm text-body">
								{T()("ai.media.image.generate.source.label")}
							</span>
						</div>
						<input
							ref={sourceInputRef}
							type="file"
							accept="image/*"
							class="hidden"
							onChange={selectSourceFile}
						/>
						<Show
							when={source()}
							fallback={
								<div class="grid min-h-20.5 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-dashed border-border bg-background-base p-2">
									<p class="min-w-0 ml-2 truncate text-sm text-body">
										{T()("ai.media.image.generate.source.empty")}
									</p>
									<div class="flex items-center gap-1">
										<Show
											when={
												source() === undefined && initialSource() !== undefined
											}
										>
											<Button
												type="button"
												theme="secondary-subtle"
												size="icon-subtle"
												title={T()("ai.media.image.generate.source.restore")}
												aria-label={T()(
													"ai.media.image.generate.source.restore",
												)}
												onClick={restoreSource}
											>
												<FaSolidArrowRotateLeft size={14} />
											</Button>
										</Show>
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											title={T()("ai.media.image.generate.source.add")}
											aria-label={T()("ai.media.image.generate.source.add")}
											onClick={() => sourceInputRef?.click()}
										>
											<FaSolidArrowUpFromBracket size={14} />
										</Button>
									</div>
								</div>
							}
						>
							{(source) => (
								<div class="grid min-w-0 grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-input-base p-2">
									<div class="rectangle-background flex h-16 min-w-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background-base">
										<Show
											when={sourcePreviewUrl()}
											fallback={
												<FaSolidImage
													class="relative z-10 h-5 w-5 text-icon-fade"
													aria-hidden="true"
												/>
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
									<div class="min-w-0">
										<p class="truncate text-sm font-medium text-title">
											{source().label}
										</p>
										<p class="mt-1 text-xs text-body">
											{T()(`ai.media.image.generate.source.${source().type}`)}
										</p>
									</div>
									<div class="flex items-center gap-1">
										<Button
											type="button"
											theme="secondary-subtle"
											size="icon-subtle"
											title={T()("ai.media.image.generate.source.replace")}
											aria-label={T()("ai.media.image.generate.source.replace")}
											onClick={() => sourceInputRef?.click()}
										>
											<FaSolidArrowUpFromBracket size={14} />
										</Button>
										<Button
											type="button"
											theme="danger-subtle"
											size="icon-subtle"
											title={T()("common.remove")}
											aria-label={T()("common.remove")}
											onClick={() => setSource(undefined)}
										>
											<FaSolidXmark size={14} />
										</Button>
									</div>
								</div>
							)}
						</Show>
					</div>
					<div class="grid min-w-0 gap-3 sm:grid-cols-3">
						<Select
							id="ai-media-image-generation-size"
							value={size()}
							onChange={(value) =>
								setSize((value ?? "1024x1024") as MediaImageGenerationSize)
							}
							options={[
								{
									value: "1024x1024",
									label: T()("ai.media.image.generate.size.option.square"),
								},
								{
									value: "1536x1024",
									label: T()("ai.media.image.generate.size.option.landscape"),
								},
								{
									value: "1024x1536",
									label: T()("ai.media.image.generate.size.option.portrait"),
								},
								{
									value: "2048x1152",
									label: T()("ai.media.image.generate.size.option.wide"),
								},
								{
									value: "2048x2048",
									label: T()(
										"ai.media.image.generate.size.option.square.large",
									),
								},
								{
									value: "3840x2160",
									label: T()("ai.media.image.generate.size.option.large.wide"),
								},
								{
									value: "2160x3840",
									label: T()(
										"ai.media.image.generate.size.option.large.portrait",
									),
								},
								{
									value: "auto",
									label: T()("ai.media.image.generate.size.option.auto"),
								},
							]}
							name="ai-media-image-generation-size"
							copy={{ label: T()("ai.media.image.generate.size.label") }}
							noClear
							noMargin
							hideOptionalText
							small
						/>
						<Select
							id="ai-media-image-generation-quality"
							value={quality()}
							onChange={(value) =>
								setQuality((value ?? "medium") as MediaImageGenerationQuality)
							}
							options={[
								{
									value: "medium",
									label: T()("ai.media.image.generate.quality.option.medium"),
								},
								{
									value: "low",
									label: T()("ai.media.image.generate.quality.option.low"),
								},
								{
									value: "high",
									label: T()("ai.media.image.generate.quality.option.high"),
								},
								{
									value: "auto",
									label: T()("ai.media.image.generate.quality.option.auto"),
								},
							]}
							name="ai-media-image-generation-quality"
							copy={{ label: T()("ai.media.image.generate.quality.label") }}
							noClear
							noMargin
							hideOptionalText
							small
						/>
						<Select
							id="ai-media-image-generation-format"
							value={outputFormat()}
							onChange={(value) =>
								setOutputFormat(
									(value ?? "webp") as MediaImageGenerationOutputFormat,
								)
							}
							options={[
								{
									value: "webp",
									label: T()("ai.media.image.generate.format.option.webp"),
								},
								{
									value: "png",
									label: T()("ai.media.image.generate.format.option.png"),
								},
								{
									value: "jpeg",
									label: T()("ai.media.image.generate.format.option.jpeg"),
								},
							]}
							name="ai-media-image-generation-format"
							copy={{ label: T()("ai.media.image.generate.format.label") }}
							noClear
							noMargin
							hideOptionalText
							small
						/>
					</div>
					<form class="min-w-0" onSubmit={submitGenerate}>
						<Label
							id="ai-media-image-generation-instruction"
							label={T()("ai.generation.instruction.label")}
							theme="basic"
							hideOptionalText
						/>
						<textarea
							id="ai-media-image-generation-instruction"
							name="ai-media-image-generation-instruction"
							value={instruction()}
							onInput={(event) => setInstruction(event.currentTarget.value)}
							onKeyDown={(event) => {
								event.stopPropagation();
								if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
									submitGenerate();
								}
							}}
							placeholder={T()(
								"ai.media.image.generate.instruction.placeholder",
							)}
							rows={8}
							class="block min-w-0 max-w-full w-full resize-none rounded-md border border-border bg-input-base p-3 text-sm font-medium text-subtitle outline-hidden transition-colors duration-200 placeholder:text-body focus:border-primary-base"
						/>
						<Show when={responseError()}>
							{(error) => <p class="mt-3 text-sm text-error-base">{error()}</p>}
						</Show>
						<div class="mt-4">
							<Button
								type="submit"
								theme="secondary"
								size="medium"
								classes="w-full min-w-0!"
								loading={isLoading()}
								disabled={!hasInstruction()}
							>
								{T()("ai.media.image.generate.modal.generate")}
							</Button>
						</div>
					</form>
				</div>
				<div
					ref={responseColumnRef}
					class="relative flex max-h-[min(72vh,760px)] min-h-130 min-w-0 w-full flex-col overflow-y-auto p-4 md:p-6"
				>
					<div class="min-w-0 pr-1">
						<div class="rectangle-background relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card-base">
							<Show
								when={selectedPreviewUrl()}
								fallback={
									<Show
										when={isLoading()}
										fallback={
											<div class="relative z-10 max-w-xs px-4 text-center text-sm text-body">
												{T()("ai.media.image.generate.response.empty")}
											</div>
										}
									>
										<span class="skeleton absolute inset-0 z-10 opacity-80" />
									</Show>
								}
							>
								{(url) => (
									<img
										src={url()}
										alt=""
										class="relative z-10 h-full max-h-96 w-full object-contain p-4"
									/>
								)}
							</Show>
							<Show when={isLoading() && selectedPreviewUrl()}>
								<div class="absolute inset-0 z-20 bg-card-base/90">
									<span class="skeleton absolute inset-0 opacity-80" />
								</div>
							</Show>
						</div>
						<Show when={generations().length > 0}>
							<div class="mt-4 min-w-0 space-y-2">
								<For each={generations()}>
									{(generation, index) => {
										const selected = createMemo(() => {
											return generation.id === selectedGenerationId();
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
													class="flex min-w-0 w-full items-center gap-3 p-3 text-left"
													onClick={() => setSelectedGenerationId(generation.id)}
												>
													<div class="rectangle-background flex h-14 w-18 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background-base">
														<img
															src={generation.output.url}
															alt=""
															class="relative z-10 h-full w-full object-contain"
														/>
													</div>
													<div class="min-w-0 flex-1">
														<div class="flex min-w-0 items-center gap-3">
															<p class="truncate text-sm font-semibold text-title">
																{generationLabel(index())}
															</p>
														</div>
														<p class="mt-1 truncate text-xs text-body">
															{generation.instruction}
														</p>
														<div class="mt-1 flex min-w-0 items-center justify-between gap-3">
															<p class="min-w-0 truncate text-xs text-unfocused">
																{generationMeta(generation)}
															</p>
															<Show when={formatAiCost(generation.cost)}>
																{(cost) => (
																	<span class="shrink-0 text-xs font-medium text-unfocused">
																		{cost()}
																	</span>
																)}
															</Show>
														</div>
													</div>
												</button>
												<div class="flex min-w-0 items-center gap-4 border-t border-border px-3 py-2">
													<button
														type="button"
														class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-unfocused underline-offset-2 transition-colors duration-200 hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base"
														onClick={() => useGenerationAsSource(generation)}
													>
														<FaSolidImage size={12} aria-hidden="true" />
														{T()("ai.media.image.generate.source.use")}
													</button>
													<button
														type="button"
														class="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-unfocused underline-offset-2 transition-colors duration-200 hover:text-title hover:underline focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60"
														disabled={isLoading()}
														onClick={() => retryGeneration(generation)}
													>
														<FaSolidArrowRotateLeft
															size={12}
															aria-hidden="true"
														/>
														{T()("ai.media.image.generate.response.retry")}
													</button>
												</div>
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
						onClick={() => close(false)}
					>
						{T()("common.cancel")}
					</Button>
				</div>
				<div class="flex items-center gap-3">
					<Show when={sessionCost()}>
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
							void accept();
						}}
						loading={aiModalsStore.get.isApplying}
						disabled={!selectedGeneration() || isLoading()}
					>
						{T()("ai.media.image.generate.modal.accept")}
					</Button>
				</div>
			</ModalFooter>
		</Modal>
	);
};

export default MediaImageGenerationModal;
