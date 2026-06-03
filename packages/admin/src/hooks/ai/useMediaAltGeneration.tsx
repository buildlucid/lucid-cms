import type { Locale, Media } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from "solid-js";
import { AiIconButton } from "@/components/Groups/AI";
import MediaAltGenerationModal, {
	type MediaAltGenerationCandidate,
} from "@/components/Modals/AI/MediaAltGenerationModal";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { LucidError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";
import {
	getDefaultTranslationLocale,
	type TranslationValue,
} from "@/utils/translation-helpers";

type ImageSource = {
	file?: File | null;
	url?: string | null;
	filename?: string;
};

type MediaContext = {
	id?: string | number;
	name?: Media["title"];
	alt?: Media["alt"];
};
type AltSetter = (
	value: Media["alt"] | ((_previous: Media["alt"]) => Media["alt"]),
) => void;

interface UseMediaAltGenerationProps {
	image: Accessor<ImageSource | null>;
	media: Accessor<MediaContext>;
	locales: Accessor<Locale[]>;
	setAlt: AltSetter;
	disabled?: Accessor<boolean>;
}

const translationsToRecord = (translations?: TranslationValue[]) => {
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
};

const useMediaAltGeneration = (props: UseMediaAltGenerationProps) => {
	// -----------------------------
	// State
	const [modalOpen, setModalOpen] = createSignal(false);
	const [generations, setGenerations] = createSignal<
		MediaAltGenerationCandidate[]
	>([]);
	const [selectedGenerationId, setSelectedGenerationId] =
		createSignal<string>();
	const [previewUrl, setPreviewUrl] = createSignal<string>();
	const [clientError, setClientError] = createSignal<string>();
	let generationId = 0;

	// -----------------------------
	// Mutation
	const generateAlt = api.ai.useMediaAltGenerate();

	// -----------------------------
	// Memos
	const hasPermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiAltGenerate]).all;
	});
	const image = createMemo(() => props.image());
	const hasImage = createMemo(() => {
		const source = image();
		return Boolean(source?.file || source?.url);
	});
	const targetLocales = createMemo(() => {
		return props.locales().map((locale) => locale.code);
	});
	const isLoading = createMemo(() => {
		return generateAlt.action.isPending;
	});
	const isDisabled = createMemo(() => {
		return (
			!hasImage() ||
			targetLocales().length === 0 ||
			isLoading() ||
			props.disabled?.() === true
		);
	});
	const tooltip = createMemo(() => {
		if (!hasImage()) return T()("ai.media.alt.generate.disabled.no.image");
		if (isLoading()) return T()("ai.media.alt.generate.loading");
		return T()("ai.media.alt.generate.action");
	});
	const responseError = createMemo(() => {
		return clientError() ?? generateAlt.errors()?.message;
	});
	const selectedGeneration = createMemo(() => {
		return generations().find(
			(generation) => generation.id === selectedGenerationId(),
		);
	});

	// -----------------------------
	// Functions
	const applyGeneratedAlt = (output: Record<string, string>) => {
		props.setAlt((previous) => {
			const previousRows = previous ?? [];
			const localeRows =
				props.locales().length > 0
					? props.locales().map((locale) => locale.code)
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
		});
	};
	const generate = async (values: { instruction?: string } = {}) => {
		const source = image();
		if (!source || isDisabled()) return;

		try {
			setClientError(undefined);
			generateAlt.reset();
			const preparedImage = await prepareAiImage(source);
			const media = props.media();
			const response = await generateAlt.action.mutateAsync({
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
						source: getDefaultTranslationLocale(props.locales()),
						target: targetLocales(),
					},
				},
			});

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
			if (error instanceof LucidError) return;
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
		}
	};
	const accept = () => {
		const generation = selectedGeneration();
		if (!generation) return;
		applyGeneratedAlt(generation.output);
		setGenerations([]);
		setSelectedGenerationId(undefined);
		setModalOpen(false);
	};
	const clear = () => {
		setGenerations([]);
		setSelectedGenerationId(undefined);
		setClientError(undefined);
		generateAlt.reset();
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

	const ActionButton: Component = () => (
		<AiIconButton
			label={T()("ai.media.alt.generate.action")}
			tooltip={tooltip()}
			disabled={isDisabled()}
			loading={isLoading()}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				if (isDisabled()) return;
				setModalOpen(true);
				void generate();
			}}
		/>
	);

	const Modal: Component = () => (
		<MediaAltGenerationModal
			state={{
				open: modalOpen(),
				setOpen: setModalOpen,
			}}
			imageUrl={previewUrl()}
			locales={props.locales()}
			generations={generations()}
			selectedGenerationId={selectedGenerationId()}
			error={responseError()}
			isLoading={isLoading()}
			callbacks={{
				onGenerate: generate,
				onAccept: accept,
				onClose: clear,
				onSelect: setSelectedGenerationId,
				onEdit: editGeneration,
				onRevert: revertGeneration,
			}}
		/>
	);

	// -----------------------------
	// Effects
	createEffect(() => {
		const source = image();
		if (source?.file) {
			const objectUrl = URL.createObjectURL(source.file);
			setPreviewUrl(objectUrl);
			onCleanup(() => URL.revokeObjectURL(objectUrl));
			return;
		}

		setPreviewUrl(source?.url ?? undefined);
	});

	// -----------------------------
	// Return
	return {
		ActionButton,
		Modal,
		generate,
		hasPermission,
		isDisabled,
		isLoading,
		errors: generateAlt.errors,
	};
};

export default useMediaAltGeneration;
