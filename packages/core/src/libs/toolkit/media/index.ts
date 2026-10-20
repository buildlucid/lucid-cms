import type {
	ContentMedia,
	IsLocalized,
	Media,
	MediaUrl,
} from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import deleteSingle from "./delete-single/index.js";
import type {
	ToolkitMediaGetMultipleInput,
	ToolkitMediaGetMultipleResult,
} from "./get-multiple/index.js";
import getMultiple from "./get-multiple/index.js";
import type { ToolkitMediaGetSingleInput } from "./get-single/index.js";
import getSingle from "./get-single/index.js";
import notifyChange from "./notify-change/index.js";
import replaceFile from "./replace-file/index.js";
import requestDownload from "./request-download/index.js";
import type { ToolkitMediaResolveUrlInput } from "./resolve-url/index.js";
import resolveUrl from "./resolve-url/index.js";
import stream from "./stream/index.js";
import updateSingle from "./update-single/index.js";
import uploadFile from "./upload-file/index.js";

/** Provides media helpers with system writes by default or a user actor's live permissions and personal-media access. */
export type ToolkitMedia = {
	/** Updates media details and returns the ID, requiring `media:update` for user actors. */
	updateSingle: (
		input: Parameters<typeof updateSingle>[1],
	) => ReturnType<typeof updateSingle>;
	/** Uploads a file and returns the new media ID, requiring `media:create` for user actors. */
	uploadFile: (
		input: Parameters<typeof uploadFile>[1],
	) => ReturnType<typeof uploadFile>;
	/** Replaces a file while preserving its ID, text, folder and visibility, requiring `media:update` for user actors. */
	replaceFile: (
		input: Parameters<typeof replaceFile>[1],
	) => ReturnType<typeof replaceFile>;
	/** Reads original file contents. */
	stream: (input: Parameters<typeof stream>[1]) => ReturnType<typeof stream>;
	/** Creates a temporary download URL. */
	requestDownload: (
		input: Parameters<typeof requestDownload>[1],
	) => ReturnType<typeof requestDownload>;
	/** Soft-deletes media or removes it permanently with `hard`, requiring `media:delete` for user actors. */
	deleteSingle: (
		input: Parameters<typeof deleteSingle>[1],
	) => ReturnType<typeof deleteSingle>;
	/** Returns media `items` and `pagination` using admin ownership filters for system reads, user visibility or `libraryOnly` access, with localized text via `locale` and transcripts via `query.include: ["transcripts"]`. */
	getMultiple: <TLocale extends string | undefined = undefined>(
		input?: ToolkitMediaGetMultipleInput<TLocale>,
	) => ServiceResponse<ToolkitMediaGetMultipleResult<TLocale>>;
	/** Returns media the actor can read by ID, restricted to library media with `libraryOnly` and localized when `locale` is supplied. */
	getSingle: <TLocale extends string | undefined = undefined>(
		input: ToolkitMediaGetSingleInput<TLocale>,
	) => ServiceResponse<ContentMedia<Media, IsLocalized<TLocale>>>;
	/** Resolves a media URL, with optional image transformations; `libraryOnly` limits it to library media, as `POST /api/v1/content/media/resolve/:key` does. */
	resolveUrl: (input: ToolkitMediaResolveUrlInput) => ServiceResponse<MediaUrl>;
	/** Reports changed IDs after direct writes. Does not save content or run authoring hooks. */
	notifyChange: (
		input: Parameters<typeof notifyChange>[1],
	) => ReturnType<typeof notifyChange>;
};

/** Creates media helpers for a toolkit instance. */
export const createMediaToolkit = (context: ServiceContext): ToolkitMedia => ({
	uploadFile: (input) => uploadFile(context, input),
	replaceFile: (input) => replaceFile(context, input),
	updateSingle: (input) => updateSingle(context, input),
	stream: (input) => stream(context, input),
	requestDownload: (input) => requestDownload(context, input),
	deleteSingle: (input) => deleteSingle(context, input),
	getMultiple: <TLocale extends string | undefined = undefined>(
		input?: ToolkitMediaGetMultipleInput<TLocale>,
	) => getMultiple<TLocale>(context, input),
	getSingle: <TLocale extends string | undefined = undefined>(
		input: ToolkitMediaGetSingleInput<TLocale>,
	) => getSingle<TLocale>(context, input),
	resolveUrl: (input) => resolveUrl(context, input),
	notifyChange: (input) => notifyChange(context, input),
});

export default createMediaToolkit;
