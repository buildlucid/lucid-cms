import { useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { EmailsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import T from "@/translations";

const EmailListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
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
				currentStatus: {
					value: "",
					type: "array",
				},
				type: {
					value: "",
					type: "array",
				},
				priority: {
					value: "",
					type: "array",
				},
			},
			sorts: {
				createdAt: "desc",
				lastAttemptedAt: undefined,
				attemptCount: undefined,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("routes.email.title"),
							description: T()("routes.email.description"),
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["email.getMultiple"],
										});
									}}
									filters={[
										{
											label: T()("common.to"),
											key: "toAddress",
											type: "text",
										},
										{
											label: T()("common.subject"),
											key: "subject",
											type: "text",
										},
										{
											label: T()("email.templates.singular"),
											key: "template",
											type: "text",
										},
										{
											label: T()("common.status"),
											key: "currentStatus",
											type: "multi-select",
											options: [
												{
													label: T()("common.status.sent"),
													value: "sent",
												},
												{
													label: T()("common.status.delivered"),
													value: "delivered",
												},
												{
													label: T()("common.status.failed"),
													value: "failed",
												},
												{
													label: T()("common.status.delayed"),
													value: "delayed",
												},
												{
													label: T()("common.status.complained"),
													value: "complained",
												},
												{
													label: T()("common.status.bounced"),
													value: "bounced",
												},
												{
													label: T()("common.status.clicked"),
													value: "clicked",
												},
												{
													label: T()("common.status.opened"),
													value: "opened",
												},
												{
													label: T()("common.status.scheduled"),
													value: "scheduled",
												},
											],
										},
										{
											label: T()("common.type"),
											key: "type",
											type: "multi-select",
											options: [
												{
													label: T()("common.internal"),
													value: "internal",
												},
												{
													label: T()("common.external"),
													value: "external",
												},
											],
										},
										{
											label: T()("common.priority"),
											key: "priority",
											type: "multi-select",
											options: [
												{
													label: "Low",
													value: "low",
												},
												{
													label: "Normal",
													value: "normal",
												},
												{
													label: "High",
													value: "high",
												},
											],
										},
									]}
									sorts={[
										{
											label: T()("common.attempt.count"),
											key: "attemptCount",
										},
										{
											label: T()("common.last.attempt.at"),
											key: "lastAttemptedAt",
										},
										{
											label: T()("common.created.at"),
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
			<EmailsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Wrapper>
	);
};

export default EmailListRoute;
