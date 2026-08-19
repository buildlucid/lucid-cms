import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import urlAddPath from "../../utils/helpers/url-add-path.js";

type CreateSignedMediaUrlParams = {
	host: string;
	path: string;
	key: string;
	secretKey: string;
	query?: Record<string, string | number | undefined>;
};

type CreateSignedMediaTokenParams = {
	path: string;
	key: string;
	timestamp: string | number;
	secretKey: string;
	query?: Record<string, string | number | undefined>;
};

type ValidateSignedMediaUrlParams = CreateSignedMediaTokenParams & {
	token: string;
};

const normalizeQuery = (query?: Record<string, string | number | undefined>) =>
	Object.fromEntries(
		Object.entries(query ?? {})
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => [key, String(value)]),
	);

const serializeQuery = (query?: Record<string, string | number | undefined>) =>
	new URLSearchParams(normalizeQuery(query)).toString();

export const createSignedMediaToken = (
	params: CreateSignedMediaTokenParams,
): string => {
	return crypto
		.createHmac("sha256", params.secretKey)
		.update(
			[
				params.path,
				params.key,
				String(params.timestamp),
				serializeQuery(params.query),
			].join("\n"),
		)
		.digest("hex");
};

export const createSignedMediaUrl = (
	params: CreateSignedMediaUrlParams,
): string => {
	const timestamp = Date.now();
	const normalizedQuery = normalizeQuery(params.query);
	const token = createSignedMediaToken({
		path: params.path,
		key: params.key,
		timestamp,
		secretKey: params.secretKey,
		query: normalizedQuery,
	});

	const query = new URLSearchParams({
		key: params.key,
		token,
		timestamp: String(timestamp),
	});

	for (const [key, value] of Object.entries(normalizedQuery)) {
		query.set(key, value);
	}

	const basePath = urlAddPath(
		params.host,
		`${constants.directories.base}/api/v1/${params.path}`,
	);

	return `${basePath}?${query.toString()}`;
};

export const validateSignedMediaUrl = (
	params: ValidateSignedMediaUrlParams,
): boolean => {
	const timestamp = Number.parseInt(String(params.timestamp), 10);
	if (!Number.isFinite(timestamp)) {
		return false;
	}

	const age = Date.now() - timestamp;
	if (age < 0 || age > constants.presignedUrlExpiration) {
		return false;
	}

	const expectedToken = createSignedMediaToken({
		path: params.path,
		key: params.key,
		timestamp,
		secretKey: params.secretKey,
		query: params.query,
	});

	if (params.token.length !== expectedToken.length) {
		return false;
	}

	return crypto.timingSafeEqual(
		Buffer.from(params.token),
		Buffer.from(expectedToken),
	);
};
