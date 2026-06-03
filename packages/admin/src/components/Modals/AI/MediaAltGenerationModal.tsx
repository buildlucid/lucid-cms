import type { Locale } from "@types";
import classnames from "classnames";
import { FaSolidArrowRotateLeft, FaSolidPaperPlane } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";

type GenerateValues = {
	instruction?: string;
};

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
	generations: MediaAltGenerationCandidate[];
	selectedGenerationId?: string;
	error?: string;
	isLoading: boolean;
	callbacks: {
		onGenerate: (_values: GenerateValues) => void | Promise<void>;
		onAccept: () => void;
		onClose: () => void;
		onSelect: (_id: string) => void;
		onEdit: (_id: string, _localeCode: string, _value: string) => void;
		onRevert: (_id: string, _localeCode: string) => void;
	};
}

const MediaAltGenerationModal: Component<MediaAltGenerationModalProps> = (
	props,
) => {
	// -----------------------------
	// State
	const [instruction, setInstruction] = createSignal("");

	// -----------------------------
	// Memos
	const hasResponse = createMemo(() => props.generations.length > 0);
	const hasInstruction = createMemo(() => instruction().trim().length > 0);
	const responseStatus = createMemo(() => {
		if (props.isLoading) return T()("ai.generation.loading");
		if (hasResponse()) {
			return T()("ai.media.alt.generate.response.history.count", {
				count: props.generations.length,
				total: props.locales.length,
			});
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
		return (
			generation.output[props.locales[0]?.code] ??
			Object.values(generation.output)[0] ??
			T()("common.empty")
		);
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
			<div class="px-4 py-4 md:px-6 md:py-5 border-b border-border">
				<h2>{T()("ai.media.alt.generate.modal.title")}</h2>
				<p class="mt-1 text-sm text-body">
					{T()("ai.media.alt.generate.modal.description")}
				</p>
			</div>
			<div class="grid gap-0 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<div class="relative min-h-130 overflow-hidden border-b border-border bg-card-base md:border-b-0 md:border-r">
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
						class="absolute inset-x-4 bottom-4 z-20 md:inset-x-6 md:bottom-6"
						onSubmit={generate}
					>
						<label
							for="ai-media-alt-generation-instruction"
							class="mb-2 flex justify-between text-sm font-medium text-white/85"
						>
							<span>{T()("ai.generation.instruction.label")}</span>
							<span class="text-xs text-white/55">
								{T()("common.optional")}
							</span>
						</label>
						<div class="relative">
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
								class="block w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 pr-12 text-sm font-medium text-white outline-hidden backdrop-blur-sm transition-colors duration-200 placeholder:text-white/50 hover:border-white/20 focus:border-primary-base focus:bg-black/30"
							/>
							<button
								type="submit"
								class="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary-base text-primary-contrast transition-colors duration-200 hover:bg-primary-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-70"
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
				<div class="relative flex min-h-130 flex-col p-4 md:p-6">
					<div class="flex shrink-0 items-start justify-between gap-4">
						<div>
							<h3 class="text-sm font-medium text-title">
								{T()("ai.media.alt.generate.response.title")}
							</h3>
							<p class="mt-1 text-xs text-body">{responseStatus()}</p>
						</div>
						<Show when={props.isLoading}>
							<div class="flex items-center gap-2 rounded-full border border-primary-muted-border bg-primary-muted-bg px-2.5 py-1 text-xs text-primary-base">
								<Spinner size="sm" />
								<span>{T()("ai.generation.loading")}</span>
							</div>
						</Show>
					</div>
					<div class="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
						<Show
							when={hasResponse()}
							fallback={
								<div class="rounded-md border border-dashed border-border bg-card-base p-5">
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
							<div class="space-y-2">
								<For each={props.generations}>
									{(generation, index) => {
										const selected = createMemo(() => {
											return generation.id === props.selectedGenerationId;
										});

										return (
											<div
												class={classnames(
													"rounded-md border bg-card-base transition-colors duration-200",
													{
														"border-primary-muted-border": selected(),
														"border-border hover:border-primary-muted-border":
															!selected(),
													},
												)}
											>
												<button
													type="button"
													class="flex w-full items-center justify-between gap-3 p-3 text-left"
													onClick={() =>
														props.callbacks.onSelect(generation.id)
													}
												>
													<div class="min-w-0">
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
													<div class="space-y-2 border-t border-border p-3 pt-2">
														<For each={props.locales}>
															{(locale) => (
																<div>
																	<div class="mb-1.5 flex items-center justify-between gap-2">
																		<div class="flex min-w-0 items-center gap-2">
																			<p class="truncate text-sm font-medium text-body">
																				{locale.name ?? locale.code}
																			</p>
																			<span class="text-sm text-body">·</span>
																			<span class="text-sm font-medium text-body">
																				{locale.code}
																			</span>
																		</div>
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
																		value={generation.output[locale.code] ?? ""}
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
																		class="block w-full resize-none rounded-md border border-border bg-background-base p-2 text-sm leading-5 text-body outline-hidden transition-colors duration-200 focus:border-primary-base"
																	/>
																</div>
															)}
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
					<Show when={hasResponse()}>
						<Button
							type="button"
							theme="primary"
							size="medium"
							onClick={props.callbacks.onAccept}
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

export default MediaAltGenerationModal;
