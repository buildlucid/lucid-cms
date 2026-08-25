import mediaFormatter from "../../formatters/media.js";
import type { MediaRefData, MediaRefResolveInput } from "./types.js";

const formatMediaRefs = (
	rows: MediaRefData,
	context: MediaRefResolveInput["format"],
) =>
	rows.map((media) =>
		mediaFormatter.formatSingle({
			media,
			options: {
				host: context.host,
				delivery: context.mediaDelivery,
			},
		}),
	);

export default formatMediaRefs;
