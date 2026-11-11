import type { Session } from "../harness/src/client/types.ts";

type UploadSession = {
	sessionId: string;
	key: string;
	request: { url: string; method: string };
};

/** Throws with the response's details when a step of an upload is refused. */
const expectStatus = (
	action: string,
	response: { status: number; body: unknown },
	status: number,
) => {
	if (response.status !== status) {
		throw new Error(
			`${action} gave ${response.status}, not ${status}: ${JSON.stringify(response.body)}`,
		);
	}
};

/**
 * Uploads a text file and returns its media ID. Requires `plugin:filesystem`, `media:create` and
 * `media:update`. `owned` creates personal media instead of library media.
 */
export const uploadMedia = async (
	session: Session,
	options: { title: string; owned?: boolean },
): Promise<number> => {
	const content = `${options.title}\n`;
	const started = await session.request<{ data: UploadSession }>({
		method: "POST",
		path: "/api/v1/media/upload-session",
		body: {
			fileName: "note.txt",
			mimeType: "text/plain",
			size: Buffer.byteLength(content),
			//* personal media must be private
			public: !options.owned,
		},
	});
	expectStatus("Starting an upload", started, 200);
	const { sessionId, key, request } = started.body.data;

	const sent = await session.fetch(
		new URL(request.url).pathname + new URL(request.url).search,
		{
			method: request.method,
			headers: { "content-type": "text/plain" },
			body: content,
		},
	);
	if (!sent.ok) {
		throw new Error(
			`Uploading the file gave ${sent.status}: ${await sent.text()}`,
		);
	}

	const completed = await session.request({
		method: "POST",
		path: `/api/v1/media/upload-session/${sessionId}/complete`,
		body: {},
	});
	expectStatus("Completing the upload", completed, 200);

	const created = await session.request<{ data: { id: number } }>({
		method: "POST",
		path: "/api/v1/media",
		body: {
			key,
			fileName: "note.txt",
			origin: "human",
			title: [{ localeCode: null, value: options.title }],
			owned: options.owned,
		},
	});
	expectStatus("Creating the media", created, 201);
	return created.body.data.id;
};
