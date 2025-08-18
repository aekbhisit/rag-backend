"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/Button";
import { useAuth } from "../../components/AuthProvider";
import { BACKEND_URL, getTenantId } from "../../components/config";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = React.useState({
    email: "",
    password: ""
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': getTenantId() },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      if (r.ok) {
        const data = await r.json();
        login(data.user?.email || formData.email);
        router.replace("/admin");
      } else {
        const err = await r.json().catch(() => null);
        setErrors({ general: err?.message || "Invalid email or password" });
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrors({ general: "Login failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/theme/logo-sm.png" width={32} height={32} alt="logo" />
            <h1 className="text-2xl font-bold text-[color:var(--text)]">RAG Admin</h1>
          </div>
          <p className="text-[color:var(--text-muted)]">
            Sign in to your admin account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700">{errors.general}</span>
                </div>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              error={errors.email}
              placeholder="admin@example.com"
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              error={errors.password}
              placeholder="Enter your password"
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-[color:var(--border)] text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                />
                <span className="text-sm text-[color:var(--text-muted)]">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-[color:var(--primary)] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-[color:var(--surface-muted)] rounded-lg">
            <h4 className="text-sm font-medium text-[color:var(--text)] mb-2">Demo Credentials:</h4>
            <div className="text-xs text-[color:var(--text-muted)] space-y-1">
              <div>Email: <code className="bg-[color:var(--surface)] px-1 rounded">admin@example.com</code></div>
              <div>Password: <code className="bg-[color:var(--surface)] px-1 rounded">password</code></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-[color:var(--text-muted)]">
            © 2024 RAG Assistant. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
