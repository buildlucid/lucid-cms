import type { MediaGenerationType } from "@types";
import { createMemo } from "solid-js";
import aiModalsStore, {
	type MediaGenerationTarget,
} from "@/store/aiModalsStore/aiModalsStore";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	mediaGenerationPermissions,
	mediaGenerationTypes,
} from "@/utils/media-generation";
import {
	createAiFeatureAccessState,
	spawnAiFeatureAccessToast,
} from "../../utils/ai-feature-access";

let targetId = 0;

const getTargetId = () => {
	targetId += 1;
	return `media-generation-${targetId}`;
};

/** Opens the media generation modal for a target, and describes its trigger's state. */
const useMediaGeneration = () => {
	// -----------------------------
	// Memos
	const enabledTypes = createMemo(() =>
		mediaGenerationTypes.filter((type) =>
			siteStore.get.isAiFeatureEnabled(`${type}Generation`),
		),
	);
	const permittedTypes = createMemo(() =>
		enabledTypes().filter(
			(type) =>
				userStore.get.hasPermission([mediaGenerationPermissions[type]]).all,
		),
	);
	const generalAccessState = createAiFeatureAccessState({
		hasPermission: () => permittedTypes().length > 0,
		connection: () => siteStore.get.connection ?? undefined,
	});
	//* for targets that only take types the person can't generate
	const noPermissionAccessState = createAiFeatureAccessState({
		hasPermission: () => false,
		connection: () => siteStore.get.connection ?? undefined,
	});
	const isBusy = createMemo(() => {
		return aiModalsStore.get.isLoading || aiModalsStore.get.isApplying;
	});

	// -----------------------------
	// Functions
	/** The types switched on in the config that the target takes, before permissions. */
	const offeredTypes = (target?: MediaGenerationTarget) => {
		const accepted = target?.types?.();
		return enabledTypes().filter(
			(type) => accepted === undefined || accepted.includes(type),
		);
	};
	/** The types the person can generate for a target. */
	const targetTypes = (target?: MediaGenerationTarget) =>
		offeredTypes(target).filter((type) => permittedTypes().includes(type));
	/** Generation access for a target, or all enabled types when no target is supplied. */
	const accessState = (target?: MediaGenerationTarget) =>
		offeredTypes(target).length > 0 && targetTypes(target).length === 0
			? noPermissionAccessState()
			: generalAccessState();
	const targetIsDisabled = (target?: MediaGenerationTarget) => {
		if (!target) return true;
		return (
			targetTypes(target).length === 0 ||
			accessState(target).disabled ||
			isBusy() ||
			target.disabled?.() === true
		);
	};
	/** Labels a single accepted media type specifically, otherwise using "Generate media". */
	const actionLabel = (types: readonly MediaGenerationType[]) =>
		types.length === 1
			? T()(`ai.media.generate.action.${types[0]}`)
			: T()("ai.media.generate.action");
	const targetTooltip = (target?: MediaGenerationTarget) => {
		const access = accessState(target);
		if (access.disabled) return access.message;
		if (isBusy()) return T()("ai.media.generate.loading");
		if (target?.disabled?.()) return T()("ai.media.generate.disabled");
		return actionLabel(offeredTypes(target));
	};
	const isActiveTarget = (targetId: string) => {
		const modal = aiModalsStore.getModal("mediaGeneration");
		return modal?.data.targetId === targetId;
	};
	const open = (target: MediaGenerationTarget, id = getTargetId()) => {
		if (offeredTypes(target).length === 0) return;
		if (spawnAiFeatureAccessToast(accessState(target))) return;
		if (targetIsDisabled(target)) return;

		aiModalsStore.open("mediaGeneration", {
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
		/** Whether configuration offers generation for a target, determining trigger visibility. */
		isOffered: (target?: MediaGenerationTarget) =>
			offeredTypes(target).length > 0,
		targetTypes,
		accessState,
		isDisabled: targetIsDisabled,
		isLoading: isBusy,
		isTargetLoading,
		getLabel: (target?: MediaGenerationTarget) =>
			actionLabel(offeredTypes(target)),
		getTooltip: targetTooltip,
		getTargetId,
	};
};

export default useMediaGeneration;
export type { MediaGenerationTarget };
