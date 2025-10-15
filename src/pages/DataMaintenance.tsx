import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { DataMaintenance as DataMaintenanceContent } from "@/components/data-maintenance/DataMaintenance";

export default function DataMaintenance() {
  return (
    <PageErrorBoundary pageName="Data Maintenance">
      <DataMaintenanceContent />
    </PageErrorBoundary>
  );
}
