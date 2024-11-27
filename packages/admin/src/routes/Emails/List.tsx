import T from "@/translations";
import type { Component } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import Query from "@/components/Groups/Query";
import Alert from "@/components/Blocks/Alert";
import Layout from "@/components/Groups/Layout";
import Headers from "@/components/Groups/Headers";
import Content from "@/components/Groups/Content";

const EmailListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				toAddress: {
					value: "",
					type: "text",
				},
				subject: {
					value: "",
					type: "text",
				},
				template: {
					value: "",
					type: "text",
				},
				deliveryStatus: {
					value: "",
					type: "array",
				},
				type: {
					value: "",
					type: "array",
				},
			},
			sorts: {
				sentCount: undefined,
				errorCount: undefined,
				createdAt: "desc",
				lastAttemptAt: undefined,
				lastSuccessAt: undefined,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {},
	});

	// ----------------------------------
	// Render

	return (
		<Layout.Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("email_support_config_stategy_error"),
								show: settings.data?.data.media.enabled === false,
							},
						]}
					/>
				),
				header: (
					<Headers.Standard
						copy={{
							title: T()("email_route_title"),
							description: T()("email_route_description"),
						}}
						slots={{
							bottom: (
								<Query.Row
									searchParams={searchParams}
									filters={[
										{
											label: T()("to"),
											key: "toAddress",
											type: "text",
										},
										{
											label: T()("subject"),
											key: "subject",
											type: "text",
										},
										{
											label: T()("template"),
											key: "template",
											type: "text",
										},
										{
											label: T()("status"),
											key: "deliveryStatus",
											type: "multi-select",
											options: [
												{
													label: T()("delivered"),
													value: "delivered",
												},
												{
													label: T()("failed"),
													value: "failed",
												},
												{
													label: T()("pending"),
													value: "pending",
												},
											],
										},
										{
											label: T()("type"),
											key: "type",
											type: "multi-select",
											options: [
												{
													label: T()("internal"),
													value: "internal",
												},
												{
													label: T()("external"),
													value: "external",
												},
											],
										},
									]}
									sorts={[
										{
											label: T()("sent_count"),
											key: "sentCount",
										},
										{
											label: T()("failed_count"),
											key: "errorCount",
										},
										{
											label: T()("last_attempt_at"),
											key: "lastAttemptAt",
										},
										{
											label: T()("last_success_at"),
											key: "lastSuccessAt",
										},
										{
											label: T()("created_at"),
											key: "createdAt",
										},
									]}
									perPage={[]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<Content.EmailsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Layout.Wrapper>
	);
};

export default EmailListRoute;
