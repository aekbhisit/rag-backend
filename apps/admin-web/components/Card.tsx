import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card shadow-md">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
}
