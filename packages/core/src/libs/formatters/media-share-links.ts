import constants from "../../constants/constants.js";
import type {
	MediaShareLinkResponse,
	MediaType,
	ShareLinkAccessResponse,
} from "../../types/response.js";
import { createShareLinkUrl } from "../../utils/media/index.js";
import formatter from "./index.js";

export interface MediaShareLinkPropsT {
	id: number;
	media_id: number;
	token: string;
	password: string | null;
	expires_at: Date | string | null;
	name: string | null;
	description: string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	created_by: number | null;
	updated_by: number | null;
}

export interface ShareLinkAccessPropsT {
	token: string;
	name: string | null;
	description: string | null;
	expires_at: Date | string | null;
	media_key: string | null;
	media_type: string | null;
	media_mime_type: string | null;
	media_file_extension: string | null;
	media_file_size: number | null;
	media_width: number | null;
	media_height: number | null;
}

const formatShareAccess = (props: {
	link: ShareLinkAccessPropsT;
	shareUrl: string;
	passwordRequired: boolean;
}): ShareLinkAccessResponse => {
	const link = props.link;
	const mediaType = (link.media_type ?? "unknown") as MediaType;
	const previewableTypes = constants.media.previewableTypes;
	const previewable = previewableTypes.includes(
		mediaType as (typeof previewableTypes)[number],
	);

	if (props.passwordRequired) {
		return {
			token: link.token,
			passwordRequired: true,
		};
	}

	return {
		token: link.token,
		name: link.name,
		description: link.description,
		expiresAt: formatter.formatDate(link.expires_at),
		hasExpired: false,
		passwordRequired: false,
		media: {
			key: link.media_key ?? "",
			type: mediaType,
			mimeType: link.media_mime_type ?? "",
			extension: link.media_file_extension ?? "",
			fileSize: link.media_file_size ?? 0,
			width: link.media_width ?? null,
			height: link.media_height ?? null,
			previewable,
			shareUrl: props.shareUrl,
		},
	};
};

const formatMultiple = (props: {
	links: MediaShareLinkPropsT[];
	host: string;
}): MediaShareLinkResponse[] => {
	return props.links.map((l) => formatSingle({ link: l, host: props.host }));
};

const formatSingle = (props: {
	link: MediaShareLinkPropsT;
	host: string;
}): MediaShareLinkResponse => {
	const hasExpired = props.link.expires_at
		? new Date(props.link.expires_at).getTime() < Date.now()
		: false;

	return {
		id: props.link.id,
		token: props.link.token,
		url: createShareLinkUrl({ token: props.link.token, host: props.host }),
		name: props.link.name,
		description: props.link.description,
		expiresAt: formatter.formatDate(props.link.expires_at),
		hasExpired,
		hasPassword: Boolean(props.link.password && props.link.password.length > 0),
		createdBy: props.link.created_by,
		updatedBy: props.link.updated_by,
		createdAt: formatter.formatDate(props.link.created_at),
		updatedAt: formatter.formatDate(props.link.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
	formatShareAccess,
};
