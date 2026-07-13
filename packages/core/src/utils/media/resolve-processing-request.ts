import constants from "../../constants/constants.js";
import chooseAcceptHeaderFormat from "./choose-accept-header-format.js";

type MediaFormat = "webp" | "avif" | "jpeg" | "png";

type ProcessingPreset = {
	width?: number;
	height?: number;
	fit?: "cover" | "contain" | "fill" | "inside" | "outside";
	format?: MediaFormat;
	quality?: number;
};

type ProcessingQuery = {
	preset?: string;
	format?: MediaFormat;
};

/**
 * Resolves the public processing request into the exact internal options Lucid will use.
 */
const resolveProcessingRequest = (props: {
	presets?: Record<string, ProcessingPreset>;
	allowFormatQuery: boolean;
	query: ProcessingQuery;
	accept?: string;
}) => {
	const selectedPreset = props.presets?.[props.query.preset ?? ""];
	const format = props.allowFormatQuery
		? chooseAcceptHeaderFormat(props.accept, props.query.format)
		: selectedPreset?.format;

	return {
		selectedPreset,
		format,
		quality: selectedPreset?.quality ?? constants.media.imagePresetQuality,
		width: selectedPreset?.width,
		height: selectedPreset?.height,
		fit: selectedPreset?.fit ?? "cover",
		hasProcessing: Boolean(selectedPreset || format),
		publicQuery: {
			preset: selectedPreset ? props.query.preset : undefined,
			format: props.allowFormatQuery ? format : undefined,
		},
	};
};

export default resolveProcessingRequest;
