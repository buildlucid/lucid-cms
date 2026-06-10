import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import { AiDraftReviewPill, AiIconButton } from "@/components/Groups/AI";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import aiModalsStore, {
	type MediaAltGenerationTarget,
} from "@/store/aiModalsStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import { prepareAiImage } from "@/utils/ai-image";
import { validateSetError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";
import {
	getDefaultTranslationLocale,
	type TranslationValue,
} from "@/utils/translation-helpers";
import {
	createAiFeatureAccessState,
	spawnAiFeatureAccessToast,
} from "./access";

let targetId = 0;

const getTargetId = () => {
	targetId += 1;
	return `media-alt-generation-${targetId}`;
};

const isSuperKeyEvent = (event: KeyboardEvent) =>
	event.key === "Meta" ||
	event.key === "OS" ||
	event.code === "MetaLeft" ||
	event.code === "MetaRight" ||
	event.code === "OSLeft" ||
	event.code === "OSRight";

type PendingDirectGeneration = {
	targetId: string;
	originalAlt: TranslationValue[] | undefined;
};

const useMediaAltGeneration = () => {
	// -----------------------------
	// State
	const [directTargetId, setDirectTargetId] = createSignal<string>();
	const [pendingDirectGeneration, setPendingDirectGeneration] =
		createSignal<PendingDirectGeneration>();
	const [superKeyHeld, setSuperKeyHeld] = createSignal(false);

	// -----------------------------
	// Queries
	const license = api.license.useGetStatus({
		queryParams: {},
	});

	// -----------------------------
	// Mutations
	const generateAlt = api.ai.useMediaAltGenerate();

	// -----------------------------
	// Memos
	const hasPermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiAltGenerate]).all;
	});
	const accessState = createAiFeatureAccessState({
		hasPermission,
		license: () => license.data?.data,
	});
	const isBusy = createMemo(() => {
		return aiModalsStore.get.isLoading || aiModalsStore.get.isApplying;
	});

	// -----------------------------
	// Functions
	const targetHasImage = (target?: MediaAltGenerationTarget) => {
		const source = target?.image();
		return Boolean(source?.file || source?.url);
	};
	const targetIsDisabled = (target?: MediaAltGenerationTarget) => {
		if (!target) return true;
		return (
			accessState().disabled ||
			!targetHasImage(target) ||
			target.locales().length === 0 ||
			isBusy() ||
			pendingDirectGeneration() !== undefined ||
			target.disabled?.() === true
		);
	};
	const targetTooltip = (target?: MediaAltGenerationTarget) => {
		const access = accessState();
		if (access.disabled) return access.message;
		if (!targetHasImage(target)) {
			return T()("ai.media.alt.generate.disabled.no.image");
		}
		if (isBusy()) return T()("ai.media.alt.generate.loading");
		if (pendingDirectGeneration()) {
			return T()("ai.media.alt.generate.quick.review.tooltip");
		}
		return T()("ai.media.alt.generate.action");
	};
	const isActiveTarget = (targetId: string) => {
		const modal = aiModalsStore.getModal("mediaAltGeneration");
		return modal?.data.targetId === targetId;
	};
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
	const buildGeneratedAlt = (
		target: MediaAltGenerationTarget,
		output: Record<string, string>,
	) => {
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
		});
	};
	const generateAndApply = async (
		target: MediaAltGenerationTarget,
		id = getTargetId(),
	) => {
		if (spawnAiFeatureAccessToast(accessState())) return;
		if (targetIsDisabled(target)) return;

		const source = target.image();
		if (!source) return;

		try {
			const originalAlt = target.media().alt;

			generateAlt.reset();
			setDirectTargetId(id);
			aiModalsStore.setLoading(true);

			const preparedImage = await prepareAiImage(source);
			const media = target.media();
			const response = await generateAlt.action.mutateAsync({
				shouldToast: () => false,
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
						source: getDefaultTranslationLocale(target.locales()),
						target: target.locales().map((locale) => locale.code),
					},
				},
			});

			aiModalsStore.setLoading(false);
			aiModalsStore.setApplying(true);
			await target.setAlt(buildGeneratedAlt(target, response.data.output));
			setPendingDirectGeneration({
				targetId: id,
				originalAlt,
			});

			spawnToast({
				title: T()("toasts.ai.media.alt.generate.success.title"),
				message: T()("toasts.ai.media.alt.generate.quick.success.message"),
				status: "success",
			});
		} catch (error) {
			const responseError = validateSetError(error);
			spawnToast({
				title: responseError.name,
				message: responseError.message,
				status: "error",
			});
		} finally {
			aiModalsStore.setLoading(false);
			aiModalsStore.setApplying(false);
			setDirectTargetId(undefined);
		}
	};
	const acceptDirectGeneration = () => {
		setPendingDirectGeneration(undefined);
	};
	const rejectDirectGeneration = async (target: MediaAltGenerationTarget) => {
		const pending = pendingDirectGeneration();
		if (!pending) return;

		try {
			aiModalsStore.setApplying(true);
			await target.setAlt(pending.originalAlt ?? []);
			setPendingDirectGeneration(undefined);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const open = (target: MediaAltGenerationTarget, id = getTargetId()) => {
		if (spawnAiFeatureAccessToast(accessState())) return;
		if (targetIsDisabled(target)) return;

		aiModalsStore.open("mediaAltGeneration", {
			data: {
				target,
				targetId: id,
			},
		});
	};
	const isTargetLoading = (targetId: string) => {
		return (
			directTargetId() === targetId ||
			(aiModalsStore.get.isLoading && isActiveTarget(targetId))
		);
	};
	const createActionButton = (target: MediaAltGenerationTarget): Component => {
		const id = getTargetId();
		const ActionButton: Component = () => (
			<div class="relative">
				<AiIconButton
					label={T()("ai.media.alt.generate.action")}
					tooltip={targetTooltip(target)}
					disabled={targetIsDisabled(target)}
					disabledClickable={accessState().disabled}
					loading={isTargetLoading(id)}
					quickActionActive={superKeyHeld() && !targetIsDisabled(target)}
					variant="subtle"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						if (event.metaKey || superKeyHeld()) {
							void generateAndApply(target, id);
							return;
						}

						open(target, id);
					}}
				/>
				<Show when={pendingDirectGeneration()?.targetId === id}>
					<AiDraftReviewPill
						label={T()("ai.media.alt.generate.quick.review.label")}
						disabled={aiModalsStore.get.isApplying}
						onAccept={acceptDirectGeneration}
						onReject={() => {
							void rejectDirectGeneration(target);
						}}
					/>
				</Show>
			</div>
		);

		return ActionButton;
	};

	// -----------------------------
	// Effects
	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || isSuperKeyEvent(event)) setSuperKeyHeld(true);
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			if (isSuperKeyEvent(event) || !event.metaKey) setSuperKeyHeld(false);
		};
		const resetSuperKey = () => setSuperKeyHeld(false);

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", resetSuperKey);
		document.addEventListener("visibilitychange", resetSuperKey);

		onCleanup(() => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", resetSuperKey);
			document.removeEventListener("visibilitychange", resetSuperKey);
		});
	});

	// -----------------------------
	// Return
	return {
		open,
		generateAndApply,
		createActionButton,
		accessState,
		hasPermission,
		isDisabled: targetIsDisabled,
		isLoading: isBusy,
		isTargetLoading,
	};
};

export default useMediaAltGeneration;
export type { MediaAltGenerationTarget };
