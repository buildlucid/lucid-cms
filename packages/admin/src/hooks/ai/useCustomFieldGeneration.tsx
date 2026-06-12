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
	type CustomFieldGenerationTarget,
} from "@/store/aiModalsStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import { validateSetError } from "@/utils/error-handling";
import spawnToast from "@/utils/spawn-toast";
import { getDefaultTranslationLocale } from "@/utils/translation-helpers";
import {
	createAiFeatureAccessState,
	spawnAiFeatureAccessToast,
} from "./access";

let targetId = 0;

const getTargetId = () => {
	targetId += 1;
	return `custom-field-generation-${targetId}`;
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
	localeCodes: string[];
	originalValues: Record<string, unknown>;
};

const useCustomFieldGeneration = () => {
	// -----------------------------
	// State
	const [directTargetId, setDirectTargetId] = createSignal<string>();
	const [pendingDirectGeneration, setPendingDirectGeneration] =
		createSignal<PendingDirectGeneration>();
	const [superKeyHeld, setSuperKeyHeld] = createSignal(false);

	// -----------------------------
	// Mutations
	const generateField = api.ai.useCustomFieldGenerate();

	// -----------------------------
	// Memos
	const featureEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("customFieldGeneration"),
	);
	const hasPermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiCustomFieldValue]).all;
	});
	const accessState = createAiFeatureAccessState({
		hasPermission,
		license: () => siteStore.get.license ?? undefined,
	});
	const isBusy = createMemo(() => {
		return aiModalsStore.get.isLoading || aiModalsStore.get.isApplying;
	});
	const defaultLocale = createMemo(() =>
		getDefaultTranslationLocale(contentLocaleStore.get.locales),
	);

	// -----------------------------
	// Functions
	const getTargetLocales = (target: CustomFieldGenerationTarget) => {
		if (!target.field().localized) return [defaultLocale()];
		return target.request().locale.target;
	};
	const getTargetValueRecord = (
		target: CustomFieldGenerationTarget,
		localeCodes: string[],
	) => {
		return localeCodes.reduce<Record<string, unknown>>(
			(accumulator, localeCode) => {
				const value = target.value(localeCode);
				if (value !== undefined) accumulator[localeCode] = value;
				return accumulator;
			},
			{},
		);
	};
	const targetIsDisabled = (target?: CustomFieldGenerationTarget) => {
		if (!target) return true;
		const request = target.request();
		return (
			!featureEnabled() ||
			accessState().disabled ||
			!request.collectionKey ||
			!request.fieldKey ||
			getTargetLocales(target).length === 0 ||
			isBusy() ||
			pendingDirectGeneration() !== undefined ||
			target.disabled?.() === true
		);
	};
	const targetTooltip = (target?: CustomFieldGenerationTarget) => {
		if (!featureEnabled()) return T()("ai.custom.field.generate.disabled");
		const access = accessState();
		if (access.disabled) return access.message;
		if (isBusy()) return T()("ai.custom.field.generate.loading");
		if (pendingDirectGeneration()) {
			return T()("ai.custom.field.generate.quick.review.tooltip");
		}
		if (target?.disabled?.()) return T()("ai.custom.field.generate.disabled");
		return T()("ai.custom.field.generate.action");
	};
	const isActiveTarget = (targetId: string) => {
		const modal = aiModalsStore.getModal("customFieldGeneration");
		return modal?.data.targetId === targetId;
	};
	const generateAndApply = async (
		target: CustomFieldGenerationTarget,
		id = getTargetId(),
	) => {
		if (!featureEnabled()) return;
		if (spawnAiFeatureAccessToast(accessState())) return;
		if (targetIsDisabled(target)) return;

		const request = target.request();
		if (!request.collectionKey) return;

		const targetLocaleCodes = getTargetLocales(target);
		const sourceLocale = targetLocaleCodes[0] ?? defaultLocale();
		if (targetLocaleCodes.length === 0) return;
		const originalValues = getTargetValueRecord(target, targetLocaleCodes);

		try {
			generateField.reset();
			setDirectTargetId(id);
			aiModalsStore.setLoading(true);

			const response = await generateField.action.mutateAsync({
				shouldToast: () => false,
				body: {
					value: getTargetValueRecord(target, targetLocaleCodes),
					document: target.document(),
					target: {
						collectionKey: request.collectionKey,
						brickKey: request.brickKey,
						fieldKey: request.fieldKey,
					},
					locale: {
						source: sourceLocale,
						target: targetLocaleCodes,
					},
				},
			});

			aiModalsStore.setLoading(false);
			aiModalsStore.setApplying(true);

			for (const localeCode of targetLocaleCodes) {
				const value =
					response.data.output[localeCode] ??
					Object.values(response.data.output)[0];
				await target.setValue(value, localeCode);
			}
			setPendingDirectGeneration({
				targetId: id,
				localeCodes: targetLocaleCodes,
				originalValues,
			});

			spawnToast({
				title: T()("toasts.ai.custom.field.generate.success.title"),
				message: T()("toasts.ai.custom.field.generate.quick.success.message"),
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
	const rejectDirectGeneration = async (
		target: CustomFieldGenerationTarget,
	) => {
		const pending = pendingDirectGeneration();
		if (!pending) return;

		try {
			aiModalsStore.setApplying(true);
			for (const localeCode of pending.localeCodes) {
				await target.setValue(pending.originalValues[localeCode], localeCode);
			}
			setPendingDirectGeneration(undefined);
		} finally {
			aiModalsStore.setApplying(false);
		}
	};
	const open = (target: CustomFieldGenerationTarget, id = getTargetId()) => {
		if (!featureEnabled()) return;
		if (spawnAiFeatureAccessToast(accessState())) return;
		if (targetIsDisabled(target)) return;

		aiModalsStore.open("customFieldGeneration", {
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
	const createActionButton = (
		target: CustomFieldGenerationTarget,
	): Component => {
		const id = getTargetId();
		const ActionButton: Component = () => (
			<Show when={featureEnabled()}>
				<div class="relative">
					<AiIconButton
						label={T()("ai.custom.field.generate.action")}
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
							label={T()("ai.custom.field.generate.quick.review.label")}
							disabled={aiModalsStore.get.isApplying}
							onAccept={acceptDirectGeneration}
							onReject={() => {
								void rejectDirectGeneration(target);
							}}
						/>
					</Show>
				</div>
			</Show>
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
		isFeatureEnabled: featureEnabled,
		accessState,
		hasPermission,
		isDisabled: targetIsDisabled,
		isLoading: isBusy,
		isTargetLoading,
		getTooltip: targetTooltip,
		getTargetId,
	};
};

export default useCustomFieldGeneration;
export type { CustomFieldGenerationTarget };
