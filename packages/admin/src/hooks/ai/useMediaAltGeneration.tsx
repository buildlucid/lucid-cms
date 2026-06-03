import type { Locale, Media } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { AiIconButton } from "@/components/Groups/AI";
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
	const generate = async () => {
		const source = image();
		if (!source || isDisabled()) return;

		try {
			generateAlt.reset();
			const preparedImage = await prepareAiImage(source);
			const media = props.media();
			const response = await generateAlt.action.mutateAsync({
				body: {
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

			applyGeneratedAlt(response.data.output);
		} catch (error) {
			if (error instanceof LucidError) return;
			if (generateAlt.errors()) return;
			spawnToast({
				title: T()("toasts.ai.media.alt.generate.error.title"),
				message:
					error instanceof Error
						? error.message
						: T()("toasts.ai.media.alt.generate.error.message"),
				status: "error",
			});
		}
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
				void generate();
			}}
		/>
	);

	// -----------------------------
	// Return
	return {
		ActionButton,
		generate,
		hasPermission,
		isDisabled,
		isLoading,
		errors: generateAlt.errors,
	};
};

export default useMediaAltGeneration;
