"use client";

import React from "react";
import TenantForm from "../../../../components/forms/TenantForm";
import { useTranslation } from "../../../../hooks/useTranslation";

export default function TenantCreatePage() {
	const { t, mounted: translationMounted } = useTranslation();
	
	return (
		<main className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">
					{translationMounted ? t('createTenant') : 'Create Tenant'}
				</h1>
			</div>
			<TenantForm />
		</main>
	);
}


