import { indexNow } from "../../constants.js";

/** One IndexNow POST: pending URLs that all share an origin, as IndexNow takes one host a request. */
export type IndexNowBatch = {
	origin: string;
	host: string;
	urls: string[];
};

/** Groups pending URLs by origin into batches of as many as one POST takes. */
const buildBatches = (urls: string[]): IndexNowBatch[] => {
	const byOrigin = Map.groupBy(urls, (url) => new URL(url).origin);
	const batches: IndexNowBatch[] = [];

	for (const [origin, group] of byOrigin) {
		const { host } = new URL(origin);
		for (let offset = 0; offset < group.length; offset += indexNow.batchSize) {
			batches.push({
				origin,
				host,
				urls: group.slice(offset, offset + indexNow.batchSize),
			});
		}
	}

	return batches;
};

export default buildBatches;
