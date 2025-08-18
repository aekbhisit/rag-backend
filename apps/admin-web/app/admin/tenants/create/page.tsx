"use client";

import React from "react";
import TenantForm from "../../../../components/forms/TenantForm";

export default function TenantCreatePage() {
	return (
		<main className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Create Tenant</h1>
			</div>
			<TenantForm />
		</main>
	);
}


