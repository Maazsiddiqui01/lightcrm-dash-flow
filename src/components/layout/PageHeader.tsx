import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <div className="space-y-1 min-w-0 flex-1">
          <h1 className="text-section-title truncate">{title}</h1>
          {description && (
            <p className="text-meta">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}