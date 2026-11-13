import { indexNow } from "../../constants.js";
import type { IndexNowBatch } from "./build-batches.js";

/** How IndexNow answered one POST. */
type IndexNowSubmitResult =
	| { type: "accepted" }
	/** Sending it again won't help, such as for a key IndexNow can't verify. */
	| { type: "rejected"; status: number; reason: string }
	/** Worth trying again later, such as after too many requests or a server error. */
	| { type: "retry"; reason: string };

/** What IndexNow's documented statuses mean, for the logs. */
const rejections: Record<number, string> = {
	400: "IndexNow could not read the request",
	403: "IndexNow could not verify the key: check the key file is served",
	422: "the URLs don't belong to the host, or the key file doesn't match the key",
};

/** POSTs a batch's URLs to an IndexNow endpoint, with the key file on the batch's own origin. */
const submitBatch = async (props: {
	endpoint: string;
	key: string;
	batch: IndexNowBatch;
}): Promise<IndexNowSubmitResult> => {
	let response: Response;
	try {
		response = await fetch(props.endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify({
				host: props.batch.host,
				key: props.key,
				keyLocation: `${props.batch.origin}/${props.key}.txt`,
				urlList: props.batch.urls,
			}),
			signal: AbortSignal.timeout(indexNow.requestTimeoutMs),
		});
	} catch (error) {
		return {
			type: "retry",
			reason: error instanceof Error ? error.message : String(error),
		};
	}

	const { status } = response;
	if (status === 200 || status === 202) return { type: "accepted" };
	if (status === 429 || status >= 500) {
		return { type: "retry", reason: `IndexNow answered ${status}` };
	}

	const body = await response.text().catch(() => "");
	return {
		type: "rejected",
		status,
		reason: [rejections[status] ?? `IndexNow answered ${status}`, body.trim()]
			.filter(Boolean)
			.join(": "),
	};
};

export default submitBatch;
