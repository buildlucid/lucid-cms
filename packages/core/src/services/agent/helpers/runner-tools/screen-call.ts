import type z from "zod";
import constants from "../../../../constants/constants.js";
import { createInteraction } from "../../../../libs/agent/interactions.js";
import type { TranslatableCopy } from "../../../../libs/i18n/types.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import { agentScreenResponseSchema } from "../../../../schemas/agent-screen.js";
import type {
	AgentScreen,
	AgentScreenCall,
} from "../../../../types/response.js";
import type { ServiceContext } from "../../../../utils/services/types.js";
import {
	type ToolOutcome,
	type ToolResult,
	toolFailure,
} from "../tool-outcome.js";
import type { RunnerToolCall } from "./types.js";

type ScreenResponse = z.output<typeof agentScreenResponseSchema>;

/** Pauses the run for the admin screen to answer, with `expireScreenCalls` handling calls that remain unanswered. */
export const screenCall = (
	context: ServiceContext,
	props: { callId: string; title: TranslatableCopy; call: AgentScreenCall },
): ToolOutcome => ({
	kind: "pending",
	pending: createInteraction({
		callId: props.callId,
		key: constants.agent.widgets.screen,
		title: context.translate(props.title),
		data: props.call,
	}),
});

const screenActions = ["read", "update", "focus"] as const satisfies Array<
	AgentScreenCall["action"]
>;

/** Consumes the waiting screen call's action, sent data and response, removing its interaction from the run's reply. */
export const takeScreenAnswer = (
	props: RunnerToolCall,
):
	| {
			action: AgentScreenCall["action"] | undefined;
			/** The data the call sent, for a step that builds on it. */
			sent: Record<string, unknown>;
			response: ScreenResponse;
	  }
	| undefined => {
	const pending = props.checkpoint.pending;
	if (!props.answer || pending?.widget.key !== constants.agent.widgets.screen) {
		return undefined;
	}

	props.checkpoint.parts = props.checkpoint.parts.filter(
		(part) =>
			part.type !== "widget" ||
			part.interaction?.id !== pending.widget.interaction.id,
	);

	const response = agentScreenResponseSchema.safeParse(
		props.answer.action === "submit" ? props.answer.response : undefined,
	);

	return {
		action: screenActions.find(
			(action) => action === pending.widget.data.action,
		),
		sent: pending.widget.data,
		response: response.success
			? response.data
			: { status: "unavailable", reason: "closed" },
	};
};

/** Tells the model why the screen couldn't answer, so it can adjust rather than retry blindly. */
export const screenUnavailable = (
	context: ServiceContext,
	response: Extract<ScreenResponse, { status: "unavailable" }>,
): ToolResult => {
	switch (response.reason) {
		case "moved":
			return toolFailure(
				response.screen
					? context.translate("server:agent.screen.unavailable.moved.to", {
							data: { name: response.screen.label },
						})
					: context.translate("server:agent.screen.unavailable.moved"),
			);
		case "closed":
			return toolFailure(
				context.translate("server:agent.screen.unavailable.closed"),
			);
		case "locked":
			return toolFailure(
				context.translate("server:agent.screen.unavailable.locked"),
			);
		case "changed":
			return toolFailure(
				context.translate("server:agent.screen.unavailable.changed"),
			);
		case "missing":
			return toolFailure(
				context.translate("server:agent.screen.unavailable.missing"),
			);
	}
};

/** The document builder the person's latest message came from, and its collection when the run can read it. */
export const resolveBuilderScreen = (
	context: ServiceContext,
	props: RunnerToolCall,
) => {
	const screen = props.checkpoint.screen;
	if (screen?.type !== "document") {
		return {
			error: toolFailure(
				context.translate("server:agent.screen.unavailable.unsupported"),
			),
			data: undefined,
		};
	}

	const collection = context.config.collections.find(
		(candidate) => candidate.key === screen.collectionKey,
	);
	if (
		!collection ||
		!hasPermission(
			props.authority,
			getCollectionPermission(collection.key, "read"),
		)
	) {
		return {
			error: toolFailure(context.translate("server:agent.tool.unavailable")),
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			screen: screen satisfies Extract<AgentScreen, { type: "document" }>,
			collection,
		},
	};
};
