import type { License } from "@types";
import { type Accessor, createMemo } from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export type AiFeatureAccessDisabledReason =
	| "no-permission"
	| "no-license"
	| "invalid-license"
	| "ai-disabled";

export type AiFeatureAccessState =
	| {
			disabled: false;
			reason: undefined;
			title: undefined;
			message: undefined;
	  }
	| {
			disabled: true;
			reason: AiFeatureAccessDisabledReason;
			title: string;
			message: string;
	  };

const enabledAccessState = (): AiFeatureAccessState => ({
	disabled: false,
	reason: undefined,
	title: undefined,
	message: undefined,
});

export const createAiFeatureAccessState = (props: {
	hasPermission: Accessor<boolean>;
	license: Accessor<License | undefined>;
}) => {
	return createMemo<AiFeatureAccessState>(() => {
		if (!props.hasPermission()) {
			return {
				disabled: true,
				reason: "no-permission",
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
			};
		}

		const license = props.license();
		if (!license) return enabledAccessState();

		if (!license.key) {
			return {
				disabled: true,
				reason: "no-license",
				title: T()("toasts.ai.features.disabled.no.license.title"),
				message: T()("toasts.ai.features.disabled.no.license.message"),
			};
		}

		if (!license.valid) {
			return {
				disabled: true,
				reason: "invalid-license",
				title: T()("toasts.ai.features.disabled.invalid.license.title"),
				message:
					license.errorMessage ??
					T()("toasts.ai.features.disabled.invalid.license.message"),
			};
		}

		if (!license.ai.enabled) {
			return {
				disabled: true,
				reason: "ai-disabled",
				title: T()("toasts.ai.features.disabled.license.title"),
				message: T()("ai.features.disabled.license"),
			};
		}

		return enabledAccessState();
	});
};

export const spawnAiFeatureAccessToast = (
	accessState: AiFeatureAccessState,
) => {
	if (!accessState.disabled) return false;

	spawnToast({
		title: accessState.title,
		message: accessState.message,
		status: "warning",
	});
	return true;
};
