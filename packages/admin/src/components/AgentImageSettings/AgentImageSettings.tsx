import type { AgentImageSettings as ImageSettings } from "@lucidcms/types";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import { mediaAlt, mediaLabel } from "@/components/AgentMediaPreview/helpers";
import type { AgentWidgetComponent } from "@/components/AgentWidget/types";
import Input from "@/components/Input/Input";
import MediaPreview from "@/components/MediaPreview/MediaPreview";
import Select from "@/components/Select/Select";
import Textarea from "@/components/Textarea/Textarea";
import type { AdminOptions } from "@/extensions/types/config";
import api from "@/services/api";
import T from "@/translations";
import { isImageSettingsData } from "@/utils/agent-tools";
import {
	fitImageOptions,
	imageGuidanceOptions,
	imageOptionSelects,
	imageSelectOptions,
} from "@/utils/media-generation";

const guidanceOptions = () =>
	imageGuidanceOptions.map((option) => ({
		value: option.key satisfies NonNullable<ImageSettings["guidance"]>,
		label: T()(option.label),
	}));

/** Reviews image settings and media metadata before generation, showing the source image for edits. */
const AgentImageSettings: AgentWidgetComponent<AdminOptions | undefined> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [settings, setSettings] = createSignal<ImageSettings>();
	const source = api.media.useGetSingle({
		queryParams: {
			location: {
				id: () =>
					isImageSettingsData(props.data)
						? (props.data.editMediaId ?? undefined)
						: undefined,
			},
		},
	});

	const models = api.ai.useGetMediaModels({ type: () => "image" });

	// ----------------------------------------
	// Memos
	const data = createMemo(() =>
		isImageSettingsData(props.data) ? props.data : undefined,
	);
	const catalog = createMemo(() => models.data?.data);
	const modelOptions = createMemo(() =>
		(catalog()?.models ?? []).filter(
			(option) => !data()?.editMediaId || option.sourceImage,
		),
	);
	//* Fall back to the first eligible model when the selected or default model is unavailable.
	const model = createMemo(() => {
		const options = modelOptions();
		const id = settings()?.model ?? catalog()?.default;
		return options.find((option) => option.id === id) ?? options[0];
	});
	//* Keep settings unchanged until the model catalogue loads.
	const fitted = createMemo(() => {
		const current = settings();
		const selected = model();
		if (!current || !selected) return current;

		return {
			...current,
			...fitImageOptions(selected, current),
			model: selected.id,
		};
	});
	const optionSelects = createMemo(() => {
		const current = model();
		return current ? imageOptionSelects(current) : [];
	});
	const disabled = createMemo(
		() =>
			props.interaction?.status !== "active" || props.interaction.submitting,
	);

	// ----------------------------------------
	// Functions
	const update = (patch: Partial<ImageSettings>) =>
		setSettings((current) => (current ? { ...current, ...patch } : current));

	// ----------------------------------------
	// Effects
	createEffect(
		on(data, (value) => {
			if (!value) return;
			const { editMediaId: _editMediaId, ...initial } = value;
			setSettings(initial);
		}),
	);
	createEffect(() => {
		const interaction = props.interaction;
		if (interaction?.status !== "active") return;

		const current = fitted();
		const instruction = current?.instruction.trim();
		const title = current?.title.trim();
		interaction.setResponse(
			current && instruction && title
				? {
						...current,
						instruction,
						title,
						alt: current.alt?.trim() || null,
					}
				: undefined,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Show
			when={fitted()}
			fallback={
				<p class="text-sm text-muted">{T()("agent.widget.unavailable")}</p>
			}
		>
			{(current) => (
				<div class="flex flex-col gap-3">
					<Show when={data()?.editMediaId}>
						{(id) => (
							<div class="flex items-center gap-3 rounded-md border border-border bg-input p-2">
								<div class="rectangle-background relative size-14 shrink-0 overflow-hidden rounded">
									<Show when={source.data?.data}>
										{(media) => (
											<MediaPreview
												media={media()}
												alt={mediaAlt(media())}
												imageFit="cover"
												preset="thumbnail-medium"
											/>
										)}
									</Show>
								</div>
								<div class="min-w-0">
									<p class="text-xs text-muted">
										{T()("agent.image.settings.editing")}
									</p>
									<p class="truncate text-sm text-title">
										{source.data?.data
											? mediaLabel(source.data.data)
											: T()("agent.preview.item", { id: id() })}
									</p>
								</div>
							</div>
						)}
					</Show>
					<Textarea
						id="agent-image-settings-instruction"
						name="agent-image-settings-instruction"
						label={T()("ai.generation.instruction.label")}
						value={current().instruction}
						onChange={(instruction) => update({ instruction })}
						disabled={disabled()}
						rows={4}
						resize
					/>
					<Select
						id="agent-image-settings-model"
						name="agent-image-settings-model"
						label={T()("ai.models.label")}
						value={model()?.id}
						onChange={(value) => update({ model: value ?? null })}
						options={modelOptions().map((option) => ({
							value: option.id,
							label: option.name,
						}))}
						description={model()?.description}
						errors={
							models.isError
								? { message: T()("ai.media.generate.models.unavailable") }
								: undefined
						}
						disabled={disabled() || !catalog()}
					/>
					<div class="grid min-w-0 gap-3 sm:grid-cols-2">
						<Select
							id="agent-image-settings-guidance"
							name="agent-image-settings-guidance"
							label={T()("ai.generation.guidance.label")}
							value={current().guidance ?? undefined}
							onChange={(guidance) => update({ guidance: guidance ?? null })}
							options={guidanceOptions()}
							placeholder={T()("agent.image.settings.guidance.none")}
							clearable
							disabled={disabled()}
						/>
						<Select
							id="agent-image-settings-aspect-ratio"
							name="agent-image-settings-aspect-ratio"
							label={T()("ai.media.image.generate.aspect.ratio.label")}
							value={current().aspectRatio}
							onChange={(aspectRatio) => {
								if (typeof aspectRatio === "string") update({ aspectRatio });
							}}
							options={imageSelectOptions(model()?.aspectRatios ?? [])}
							disabled={disabled() || !model()}
						/>
						<For each={optionSelects()}>
							{(select) => (
								<Select
									id={`agent-image-settings-${select.key}`}
									name={`agent-image-settings-${select.key}`}
									label={select.label}
									value={current()[select.key] ?? undefined}
									onChange={(value) => {
										if (typeof value === "string") {
											update({ [select.key]: value });
										}
									}}
									options={select.options}
									disabled={disabled()}
								/>
							)}
						</For>
					</div>
					<div class="grid min-w-0 gap-3 sm:grid-cols-2">
						<Input
							id="agent-image-settings-title"
							name="agent-image-settings-title"
							type="text"
							label={T()("common.title")}
							value={current().title}
							onChange={(title) => update({ title })}
							disabled={disabled()}
						/>
						<Input
							id="agent-image-settings-alt"
							name="agent-image-settings-alt"
							type="text"
							label={T()("agent.image.settings.alt")}
							value={current().alt ?? ""}
							onChange={(alt) => update({ alt })}
							disabled={disabled()}
						/>
					</div>
				</div>
			)}
		</Show>
	);
};

export default AgentImageSettings;
