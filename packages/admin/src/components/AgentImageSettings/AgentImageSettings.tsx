import type { AgentImageSettings as ImageSettings } from "@types";
import { createEffect, createMemo, createSignal, on, Show } from "solid-js";
import { mediaAlt, mediaLabel } from "@/components/AgentMediaPreview/helpers";
import type { AgentWidgetComponent } from "@/components/AgentWidget/types";
import Input from "@/components/Input/Input";
import {
	imageGuidanceOptions,
	resolutionPresets,
} from "@/components/MediaImageGenerationModal/utils/media-image-generation";
import MediaPreview from "@/components/MediaPreview/MediaPreview";
import Select from "@/components/Select/Select";
import Textarea from "@/components/Textarea/Textarea";
import type { AdminOptions } from "@/extensions/types/config";
import api from "@/services/api";
import T from "@/translations";
import { isImageSettingsData } from "@/utils/agent-tools";

const sizeOptions = () =>
	resolutionPresets.flatMap((option) =>
		option.value === "custom"
			? []
			: [
					{
						value: option.value satisfies ImageSettings["size"],
						label: T()(option.label),
					},
				],
	);
const guidanceOptions = () =>
	imageGuidanceOptions.map((option) => ({
		value: option.key satisfies NonNullable<ImageSettings["guidance"]>,
		label: T()(option.label),
	}));
const qualityOptions = () =>
	(["medium", "low", "high", "auto"] satisfies ImageSettings["quality"][]).map(
		(value) => ({
			value,
			label: T()(`ai.media.image.generate.quality.option.${value}`),
		}),
	);
const formatOptions = () =>
	(["webp", "png", "jpeg"] satisfies ImageSettings["outputFormat"][]).map(
		(value) => ({
			value,
			label: T()(`ai.media.image.generate.format.option.${value}`),
		}),
	);

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

	// ----------------------------------------
	// Memos
	const data = createMemo(() =>
		isImageSettingsData(props.data) ? props.data : undefined,
	);
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

		const current = settings();
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
			when={settings()}
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
							id="agent-image-settings-size"
							name="agent-image-settings-size"
							label={T()("ai.media.image.generate.resolution.label")}
							value={current().size}
							onChange={(size) => {
								if (size) update({ size });
							}}
							options={sizeOptions()}
							disabled={disabled()}
						/>
						<Select
							id="agent-image-settings-quality"
							name="agent-image-settings-quality"
							label={T()("ai.media.image.generate.quality.label")}
							value={current().quality}
							onChange={(quality) => {
								if (quality) update({ quality });
							}}
							options={qualityOptions()}
							disabled={disabled()}
						/>
						<Select
							id="agent-image-settings-format"
							name="agent-image-settings-format"
							label={T()("ai.media.image.generate.format.label")}
							value={current().outputFormat}
							onChange={(outputFormat) => {
								if (outputFormat) update({ outputFormat });
							}}
							options={formatOptions()}
							disabled={disabled()}
						/>
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
