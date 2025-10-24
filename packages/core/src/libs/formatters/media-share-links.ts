import Formatter from "./index.js";
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

export default class MediaShareLinksFormatter {
	formatMultiple = (props: {
		links: MediaShareLinkPropsT[];
		host: string;
	}): MediaShareLinkResponse[] => {
		return props.links.map((l) =>
			this.formatSingle({ link: l, host: props.host }),
		);
	};
	formatSingle = (props: {
		link: MediaShareLinkPropsT;
		host: string;
	}): MediaShareLinkResponse => {
		return {
			id: props.link.id,
			token: props.link.token,
			url: createShareLinkUrl({ token: props.link.token, host: props.host }),
			name: props.link.name,
			description: props.link.description,
			expiresAt: Formatter.formatDate(props.link.expires_at),
			hasPassword: Boolean(
				props.link.password && props.link.password.length > 0,
			),
			createdBy: props.link.created_by,
			updatedBy: props.link.updated_by,
			createdAt: Formatter.formatDate(props.link.created_at),
			updatedAt: Formatter.formatDate(props.link.updated_at),
		};
	};
}
