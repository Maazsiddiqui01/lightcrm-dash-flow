import { ArticlesSheet } from "@/components/articles/ArticlesSheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResponsivePageShell } from "@/components/layout/ResponsivePageShell";

export default function Articles() {
  return (
    <ResponsivePageShell>
      <PageHeader 
        title="Articles Repository" 
        description="Manage articles organized by focus areas" 
      />
      <ArticlesSheet />
    </ResponsivePageShell>
  );
}