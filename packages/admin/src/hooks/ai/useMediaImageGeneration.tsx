import { createMemo } from "solid-js";
import { Permissions } from "@/constants/permissions";
import aiModalsStore, {
	type MediaImageGenerationTarget,
} from "@/store/aiModalsStore";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import {
	createAiFeatureAccessState,
	spawnAiFeatureAccessToast,
} from "./access";

let targetId = 0;

const getTargetId = () => {
	targetId += 1;
	return `media-image-generation-${targetId}`;
};

const useMediaImageGeneration = () => {
	// -----------------------------
	// Memos
	const featureEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("imageGeneration"),
	);
	const hasPermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiImageGenerate]).all;
	});
	const accessState = createAiFeatureAccessState({
		hasPermission,
		license: () => siteStore.get.license ?? undefined,
	});
	const isBusy = createMemo(() => {
		return aiModalsStore.get.isLoading || aiModalsStore.get.isApplying;
	});

	// -----------------------------
	// Functions
	const targetIsDisabled = (target?: MediaImageGenerationTarget) => {
		if (!target) return true;
		return (
			!featureEnabled() ||
			accessState().disabled ||
			isBusy() ||
			target.disabled?.() === true
		);
	};
	const targetTooltip = (target?: MediaImageGenerationTarget) => {
		if (!featureEnabled()) return T()("ai.media.image.generate.disabled");
		const access = accessState();
		if (access.disabled) return access.message;
		if (isBusy()) return T()("ai.media.image.generate.loading");
		if (target?.disabled?.()) return T()("ai.media.image.generate.disabled");
		return T()("ai.media.image.generate.action");
	};
	const isActiveTarget = (targetId: string) => {
		const modal = aiModalsStore.getModal("mediaImageGeneration");
		return modal?.data.targetId === targetId;
	};
	const open = (target: MediaImageGenerationTarget, id = getTargetId()) => {
		if (!featureEnabled()) return;
		if (spawnAiFeatureAccessToast(accessState())) return;
		if (targetIsDisabled(target)) return;

		aiModalsStore.open("mediaImageGeneration", {
			data: {
				target,
				targetId: id,
			},
		});
	};
	const isTargetLoading = (targetId: string) => {
		return aiModalsStore.get.isLoading && isActiveTarget(targetId);
	};

	// -----------------------------
	// Return
	return {
		open,
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

export default useMediaImageGeneration;
export type { MediaImageGenerationTarget };
