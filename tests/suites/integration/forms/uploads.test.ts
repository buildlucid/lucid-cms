import type { Lucid } from "#harness/client";
import { describe, expect, requires, test } from "#harness/vitest";
import { UPLOAD_FORM_KEY } from "#shared/config/fragments/forms";
import { saveDocument } from "#shared/helpers/documents";
import {
	findSubmission,
	formPath,
	SUBMISSIONS_KEY,
	type SubmitResponse,
} from "#shared/helpers/forms";
import {
	files,
	getMedia,
	type MediaFile,
	uploadMedia,
} from "#shared/helpers/media";

/** Posts the code-defined application form as a browser does, with its files. */
const apply = (lucid: Lucid, name: string, attached: MediaFile[]) => {
	const body = new FormData();
	body.set("name", name);
	for (const file of attached) {
		body.append(
			"cv",
			new File([file.bytes.slice()], file.name, { type: file.mimeType }),
		);
	}

	return lucid.session().fetch(`${formPath(UPLOAD_FORM_KEY)}/submit`, {
		method: "POST",
		body,
		headers: { accept: "application/json" },
	});
};

const uniqueName = () => `Applicant ${crypto.randomUUID()}`;

describe("a form's uploaded files", () => {
	requires("plugin:forms", "feature:mediaStorage");

	test("are stored privately and download for people who can read the submission", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const name = uniqueName();
		const file = files.text("My CV\n", "cv.txt");

		const sent = await apply(lucid, name, [file]);

		expect(sent.status).toBe(200);
		const submission = await findSubmission(admin, name, UPLOAD_FORM_KEY);
		expect(submission?.values.files).toMatchObject([
			{ field: "cv", fileName: "cv.txt", public: false },
		]);
		const mediaId = submission?.values.files[0]?.mediaId ?? 0;
		const download = await admin.request<{ data: { url: string } }>({
			method: "POST",
			path: `/api/v1/forms/submissions/${submission?.id}/files/${mediaId}/download`,
		});
		expect(download.status).toBe(200);
		const url = new URL(download.body.data.url);
		const served = await lucid.session().fetch(url.pathname + url.search);
		expect(await served.text()).toBe("My CV\n");

		//* the library doesn't list it, and a file that isn't the submission's can't be reached through it
		const library = await admin.request<{ data: Array<{ id: number }> }>({
			path: "/api/v1/media",
			query: { perPage: 100 },
		});
		expect(library.body.data.map((media) => media.id)).not.toContain(mediaId);
		const other = await admin.request({
			method: "POST",
			path: `/api/v1/forms/submissions/${submission?.id}/files/${mediaId + 999}/download`,
		});
		expect(other.status).toBe(404);
	});

	test("stay the form's own, whatever a submission's document is changed to say", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const name = uniqueName();
		await apply(lucid, name, [files.text("Mine\n", "cv.txt")]);
		const submission = await findSubmission(admin, name, UPLOAD_FORM_KEY);
		const library = await uploadMedia(admin, {
			title: "Library file",
			file: files.text("Not a submission's\n", "library.txt"),
		});

		//* someone who can edit submissions points this one at media it never had
		await saveDocument(admin, SUBMISSIONS_KEY, submission?.id ?? 0, {
			fields: [
				{ key: "summary", type: "text", value: name },
				{ key: "form", type: "text", value: UPLOAD_FORM_KEY },
				{ key: "status", type: "select", value: "read" },
				{
					key: "values",
					type: "json",
					value: {
						...submission?.values,
						files: [
							{
								field: "cv",
								mediaId: library,
								fileName: "library.txt",
								public: false,
							},
						],
					},
				},
			],
		});

		const download = await admin.request({
			method: "POST",
			path: `/api/v1/forms/submissions/${submission?.id}/files/${library}/download`,
		});
		expect(download.status).toBe(404);

		const original = submission?.values.files[0]?.mediaId ?? 0;
		for (const path of ["", "/permanent"]) {
			const deleted = await admin.request({
				method: "DELETE",
				path: `/api/v1/documents/${SUBMISSIONS_KEY}/${submission?.id}${path}`,
			});
			expect(deleted.status).toBe(204);
		}

		//* the submission goes with the file the form stored for it, and nothing else
		expect(await findSubmission(admin, name, UPLOAD_FORM_KEY)).toBeUndefined();
		expect(
			(await admin.request({ path: `/api/v1/media/${original}` })).status,
		).toBe(404);
		expect((await getMedia(admin, library)).id).toBe(library);
	});

	test("are refused when missing, of another type, too many, too large or empty", async ({
		lucid,
	}) => {
		const send = async (attached: MediaFile[]) => {
			const response = await apply(lucid, uniqueName(), attached);
			return {
				status: response.status,
				body: (await response.json()) as SubmitResponse,
			};
		};

		const missing = await send([]);
		const wrongType = await send([files.png()]);
		const tooMany = await send([files.text(), files.text()]);
		const tooLarge = await send([files.sized(1024 * 1024 + 1)]);
		const empty = await send([files.text("", "empty.txt")]);

		expect(missing.body.errors?.values?.cv?.code).toBe("required");
		expect(wrongType.body.errors?.values?.cv?.code).toBe("file_type");
		expect(tooMany.body.errors?.values?.cv?.code).toBe("too_many");
		expect(tooLarge.body.errors?.values?.cv?.code).toBe("file_size");
		expect(empty.body.errors?.values?.cv?.code).toBe("file_empty");
		expect(
			[missing, wrongType, tooMany, tooLarge, empty].map((sent) => sent.status),
		).toEqual([400, 400, 400, 400, 400]);
	});

	test("are deleted with their submission, once it is deleted for good", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const name = uniqueName();
		await apply(lucid, name, [files.text("Mine\n", "cv.txt")]);
		const submission = await findSubmission(admin, name, UPLOAD_FORM_KEY);
		const mediaId = submission?.values.files[0]?.mediaId ?? 0;
		const media = () => admin.request({ path: `/api/v1/media/${mediaId}` });
		expect((await media()).status).toBe(200);

		const binned = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${SUBMISSIONS_KEY}/${submission?.id}`,
		});
		expect(binned.status).toBe(204);
		expect((await media()).status).toBe(200);

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${SUBMISSIONS_KEY}/${submission?.id}/permanent`,
		});
		expect(deleted.status).toBe(204);
		expect((await media()).status).toBe(404);
	});
});
