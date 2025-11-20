import formatter from "./index.js";
import type { MediaShareLinkResponse } from "../../types/response.js";
import { createShareLinkUrl } from "../../utils/media/index.js";

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
		? new Date(props.link.expires_at).getTime() < new Date().getTime()
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
};
