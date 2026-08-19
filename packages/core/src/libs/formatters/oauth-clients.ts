import type { OAuthClientAuthMethod } from "../db/tables/index.js";
import type { BooleanInt } from "../db/types.js";
import formatter from "./helpers.js";
import type { MediaFormatterOptions, MediaPosterPropsT } from "./media.js";
import mediaFormatter from "./media.js";

export type OAuthClientRow = {
	id: number;
	client_id: string;
	name: string;
	client_uri: string | null;
	token_endpoint_auth_method: OAuthClientAuthMethod;
	logo_media_id: number | null;
	enabled: BooleanInt;
	created_by: number | null;
	created_at: Date | string;
	updated_at: Date | string | null;
	redirect_uris: Array<{
		redirect_uri: string;
	}>;
	logo: MediaPosterPropsT[];
};

const formatSingle = (props: {
	client: OAuthClientRow;
	mediaOptions: MediaFormatterOptions;
}) => ({
	id: props.client.id,
	clientId: props.client.client_id,
	name: props.client.name,
	clientUri: props.client.client_uri,
	authMethod: props.client.token_endpoint_auth_method,
	redirectUris: props.client.redirect_uris.map((row) => row.redirect_uri),
	logo: mediaFormatter.formatMediaImagePreview({
		poster: props.client.logo[0],
		options: props.mediaOptions,
	}),
	enabled: formatter.formatBoolean(props.client.enabled),
	createdBy: props.client.created_by,
	createdAt: formatter.formatDate(props.client.created_at) as string,
	updatedAt: formatter.formatDate(props.client.updated_at),
});

export default {
	formatSingle,
};
