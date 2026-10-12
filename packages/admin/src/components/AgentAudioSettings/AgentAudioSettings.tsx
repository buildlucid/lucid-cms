import type { AgentAudioSettings as AudioSettings } from "@types";
import { createEffect, createMemo, createSignal, on, Show } from "solid-js";
import type { AgentWidgetComponent } from "@/components/AgentWidget/types";
import Input from "@/components/Input/Input";
import Select from "@/components/Select/Select";
import Textarea from "@/components/Textarea/Textarea";
import VoiceSelect from "@/components/VoiceSelect/VoiceSelect";
import type { AdminOptions } from "@/extensions/types/config";
import api from "@/services/api";
import T from "@/translations";
import { isAudioSettingsData } from "@/utils/agent-tools";

/** Reviews the script, voice and model before an agent generates audio. */
const AgentAudioSettings: AgentWidgetComponent<AdminOptions | undefined> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [settings, setSettings] = createSignal<AudioSettings>();
	const models = api.ai.useGetMediaModels({ type: () => "audio" });

	// ----------------------------------------
	// Memos
	const data = createMemo(() =>
		isAudioSettingsData(props.data) ? props.data : undefined,
	);
	const catalog = createMemo(() => models.data?.data);
	const model = createMemo(() => {
		const id = settings()?.model ?? catalog()?.default;
		return catalog()?.models.find((option) => option.id === id);
	});
	const voice = createMemo(() => {
		const current = model();
		if (!current) return undefined;
		const id = settings()?.voice;
		return (
			current.voices.find((option) => option.id === id)?.id ??
			current.defaultVoice
		);
	});
	const disabled = createMemo(
		() =>
			props.interaction?.status !== "active" || props.interaction.submitting,
	);

	// ----------------------------------------
	// Functions
	const update = (patch: Partial<AudioSettings>) =>
		setSettings((current) => (current ? { ...current, ...patch } : current));

	// ----------------------------------------
	// Effects
	createEffect(on(data, (value) => value && setSettings(value)));
	createEffect(() => {
		const interaction = props.interaction;
		if (interaction?.status !== "active") return;

		const current = settings();
		const script = current?.script.trim();
		const title = current?.title.trim();
		interaction.setResponse(
			current && script && title
				? {
						script,
						title,
						instruction:
							model()?.instructions === false
								? null
								: current.instruction?.trim() || null,
						model: model()?.id ?? current.model,
						voice: voice() ?? current.voice,
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
					<Select
						id="agent-audio-settings-model"
						name="agent-audio-settings-model"
						label={T()("ai.models.label")}
						value={model()?.id}
						onChange={(value) => update({ model: value ?? null })}
						options={(catalog()?.models ?? []).map((option) => ({
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
					<VoiceSelect
						id="agent-audio-settings-voice"
						name="agent-audio-settings-voice"
						voices={model()?.voices ?? []}
						value={voice()}
						onChange={(value) => update({ voice: value })}
						disabled={disabled() || !model()}
					/>
					<Show when={model()?.instructions}>
						<Textarea
							id="agent-audio-settings-instruction"
							name="agent-audio-settings-instruction"
							label={T()("ai.generation.instruction.label")}
							placeholder={T()(
								"ai.media.audio.generate.instruction.placeholder",
							)}
							value={current().instruction ?? ""}
							onChange={(instruction) => update({ instruction })}
							disabled={disabled()}
							rows={2}
							resize
						/>
					</Show>
					<Textarea
						id="agent-audio-settings-script"
						name="agent-audio-settings-script"
						label={T()("ai.media.audio.generate.script.label")}
						value={current().script}
						onChange={(script) => update({ script })}
						disabled={disabled()}
						rows={6}
						resize
					/>
					<Input
						id="agent-audio-settings-title"
						name="agent-audio-settings-title"
						type="text"
						label={T()("common.title")}
						value={current().title}
						onChange={(title) => update({ title })}
						disabled={disabled()}
					/>
				</div>
			)}
		</Show>
	);
};

export default AgentAudioSettings;
