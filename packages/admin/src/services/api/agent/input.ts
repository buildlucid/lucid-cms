import type {
	AgentDelivery,
	AgentInputAction,
	AgentReferenceInput,
} from "@types";
import request from "@/utils/request";
import { runStreamUrls } from "./stream-run";

/** Input commands never replace the stream carrying the current reply. */
export const submitInput = (props: {
	conversationId: string;
	text: string;
	references: AgentReferenceInput[];
	requestId: string;
	delivery: AgentDelivery;
}) =>
	request({
		//* the endpoint streams when asked to; this call only queues
		url: runStreamUrls.send(props.conversationId),
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
