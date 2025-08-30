import crypto from "node:crypto";
import Formatter from "../../libs/formatters/index.js";

const genEmailHash = (data: {
	to: string;
	template: string;
	data: Record<string, unknown>;
}) => {
	const hashString = `${Formatter.stringifyJSON(data.data)}${data.template}${data.to}`;

	return crypto.createHash("sha256").update(hashString).digest("hex");
};

export default genEmailHash;
