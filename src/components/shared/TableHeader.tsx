import { cn } from "@/lib/utils";

interface TableHeaderProps {
  title: string;
  className?: string;
}

export function TableHeader({ title, className }: TableHeaderProps) {
  return (
    <div className={cn(
      "bg-table-header-main text-table-header-main-foreground px-6 py-4",
      "font-calibri-light font-normal text-sm tracking-wide uppercase",
      "border-b border-table-header-main",
      className
    )}>
      {title}
    </div>
  );
}