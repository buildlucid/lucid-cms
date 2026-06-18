import type {
	EmailContextData,
	EmailTemplateData,
} from "../../../libs/email/types.js";
import deepMerge from "../../../utils/helpers/deep-merge.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const mergeEmailContextData = (props: {
	data: Record<string, unknown>;
	context: EmailContextData;
}) => {
	const data = {
		...props.data,
		context: isRecord(props.data.context) ? props.data.context : undefined,
	};

	return deepMerge(
		{
			context: props.context,
		},
		data,
	) as EmailTemplateData;
};

export default mergeEmailContextData;
