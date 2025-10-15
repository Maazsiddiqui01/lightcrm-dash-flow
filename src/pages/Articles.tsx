import { ArticlesSheet } from "@/components/articles/ArticlesSheet";
import { ArticlesRepository } from "@/components/articles/ArticlesRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";

export default function Articles() {
  return (
    <PageErrorBoundary pageName="Articles">
      <ResponsivePageShell>
        <PageHeader 
          title="Articles Repository" 
          description="Manage articles organized by focus areas" 
        />
        <div className="space-y-8">
          <ArticlesSheet />
          <ArticlesRepository />
        </div>
      </ResponsivePageShell>
    </PageErrorBoundary>
  );
}