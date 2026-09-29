import type {
	AgentDelivery,
	AgentInputAction,
	AgentReferenceInput,
} from "@types";
import request from "@/utils/request";

/** Input commands never replace the stream carrying the current reply. */
export const submitInput = (props: {
	conversationId: string;
	text: string;
	references: AgentReferenceInput[];
	requestId: string;
	delivery: AgentDelivery;
}) =>
	request({
		url: `/lucid/api/v1/agent/conversations/${props.conversationId}/messages`,
		method: "POST",
		body: {
			text: props.text,
			references: props.references,
			requestId: props.requestId,
			delivery: props.delivery,
		},
	});

export const updateInput = (props: {
	conversationId: string;
	action: AgentInputAction;
}) =>
	request({
		url: `/lucid/api/v1/agent/conversations/${props.conversationId}/inputs`,
		method: "PATCH",
		body: props.action,
	});
