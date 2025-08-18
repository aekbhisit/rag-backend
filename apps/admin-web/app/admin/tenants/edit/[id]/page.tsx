"use client";

import React from "react";
import { useParams } from "next/navigation";
import TenantForm from "../../../../../components/forms/TenantForm";

export default function TenantEditPage() {
	const { id } = useParams() as { id?: string };
	return (
		<main className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Edit Tenant</h1>
			</div>
			<TenantForm tenantId={id} />
		</main>
	);
}


