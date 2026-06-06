import { type Component, createMemo } from "solid-js";
import { AiIconButton } from "@/components/Groups/AI";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import aiModalsStore, {
	type MediaAltGenerationTarget,
} from "@/store/aiModalsStore";
import userStore from "@/store/userStore";
import T from "@/translations";

let targetId = 0;

const getTargetId = () => {
	targetId += 1;
	return `media-alt-generation-${targetId}`;
};

const useMediaAltGeneration = () => {
	// -----------------------------
	// Queries
	const license = api.license.useGetStatus({
		queryParams: {},
	});

	// -----------------------------
	// Memos
	const hasPermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiAltGenerate]).all;
	});
	const aiFeaturesEnabled = createMemo(() => {
		return license.data?.data.ai.enabled !== false;
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
			!aiFeaturesEnabled() ||
			!targetHasImage(target) ||
			target.locales().length === 0 ||
			isBusy() ||
			target.disabled?.() === true
		);
	};
	const targetTooltip = (target?: MediaAltGenerationTarget) => {
		if (!aiFeaturesEnabled()) {
			return T()("ai.features.disabled.license");
		}
		if (!targetHasImage(target)) {
			return T()("ai.media.alt.generate.disabled.no.image");
		}
		if (isBusy()) return T()("ai.media.alt.generate.loading");
		return T()("ai.media.alt.generate.action");
	};
	const isActiveTarget = (targetId: string) => {
		const modal = aiModalsStore.getModal("mediaAltGeneration");
		return modal?.data.targetId === targetId;
	};
	const open = (target: MediaAltGenerationTarget, id = getTargetId()) => {
		if (targetIsDisabled(target)) return;

		aiModalsStore.open("mediaAltGeneration", {
			data: {
				target,
				targetId: id,
			},
		});
	};
	const createActionButton = (target: MediaAltGenerationTarget): Component => {
		const id = getTargetId();
		const ActionButton: Component = () => (
			<AiIconButton
				label={T()("ai.media.alt.generate.action")}
				tooltip={targetTooltip(target)}
				disabled={targetIsDisabled(target)}
				loading={aiModalsStore.get.isLoading && isActiveTarget(id)}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					open(target, id);
				}}
			/>
		);

		return ActionButton;
	};

	// -----------------------------
	// Return
	return {
		open,
		createActionButton,
		hasPermission,
		isDisabled: () => targetIsDisabled(),
		isLoading: isBusy,
	};
};

export default useMediaAltGeneration;
export type { MediaAltGenerationTarget };
