import lucid, { toolkit } from "@lucidcms/core";
import { LucidAPIError, formatAPIResponse } from "@lucidcms/core/api";
import scalarApiReference from "@scalar/fastify-api-reference";

lucid.fastify.register(scalarApiReference, {
	routePrefix: "/documentation",
	configuration: {
		theme: "deepSpace",
	},
});

lucid.fastify.post("/send-email", async (request, reply) => {
	const res = await toolkit.email.sendEmail({
		to: "hello@williamyallop.com",
		subject: "Hello",
		template: "contact-form",
		data: {
			name: "William",
			email: "william@lucidcms.io",
			message: "hello@williamyallop.com",
		},
	});
	if (res.error) throw new LucidAPIError(res.error);

	reply.send(
		formatAPIResponse(request, {
			data: res.data,
		}),
	);
});

lucid.fastify.get("/get-documents", async (request, reply) => {
	const PAGE = 1;
	const PER_PAGE = 10;

	const res = await toolkit.document.getMultiple({
		collectionKey: "page",
		status: "draft",
		query: {
			filter: {
				// id: {
				// value: 1,
				// },
				// _page_title: {
				// 	value: "About",
				// 	operator: "=",
				// },
			},
			page: PAGE,
			perPage: PER_PAGE,
		},
	});
	if (res.error) throw new LucidAPIError(res.error);

	reply.send(
		formatAPIResponse(request, {
			data: res.data.data,
			pagination: {
				count: res.data.count,
				page: PAGE,
				perPage: PER_PAGE,
			},
		}),
	);
});

lucid.fastify.get("/get-document", async (request, reply) => {
	const res = await toolkit.document.getSingle({
		collectionKey: "page",
		status: "draft",
		query: {
			filter: {
				id: {
					value: 1,
				},
				// _simpleHeading: {
				// 	value: "Homepage",
				// },
				// "simple.items._itemTitle": {
				// 	value: "Title One",
				// },
			},
			include: ["bricks"],
		},
	});
	if (res.error) throw new LucidAPIError(res.error);

	reply.send(
		formatAPIResponse(request, {
			data: res.data,
		}),
	);
});

lucid.fastify.get("/get-locales", async (request, reply) => {
	const res = await toolkit.locale.getAll();
	if (res.error) throw new LucidAPIError(res.error);

	reply.send(
		formatAPIResponse(request, {
			data: res.data,
		}),
	);
});

lucid.start();
