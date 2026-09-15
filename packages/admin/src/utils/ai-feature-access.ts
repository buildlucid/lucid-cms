import type { ConnectionStatus } from "@types";
import { type Accessor, createMemo } from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export type AiFeatureAccessDisabledReason =
	| "no-permission"
	| "no-connection"
	| "connection-revoked";

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
	connection: Accessor<ConnectionStatus | undefined>;
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

		const connection = props.connection();
		if (!connection || connection.status === "disconnected") {
			return {
				disabled: true,
				reason: "no-connection",
				title: T()("toasts.ai.features.disabled.no.connection.title"),
				message: T()("toasts.ai.features.disabled.no.connection.message"),
			};
		}

		if (connection.status === "revoked") {
			return {
				disabled: true,
				reason: "connection-revoked",
				title: T()("toasts.ai.features.disabled.revoked.title"),
				message: T()("toasts.ai.features.disabled.revoked.message"),
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
