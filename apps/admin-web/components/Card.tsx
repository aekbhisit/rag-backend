import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card shadow-md">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-body ${className || ''}`}>{children}</div>;
}
