import React from "react";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { DataTableExample } from "@/components/shared/DataTableExample";

export function DataTableTest() {
  return (
    <PageErrorBoundary pageName="Data Table Test">
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <DataTableExample />
        </div>
      </div>
    </PageErrorBoundary>
  );
}