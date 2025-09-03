import React from "react";
import { DataTable } from "./DataTable";

// Example component demonstrating DataTable usage
const DataTableExample = () => {
  // Example data with mixed types
  const exampleData = [
    {
      id: 1,
      occurred_at: "2025-01-15T10:30:00Z",
      subject: "Meeting with Client A",
      source: "Email",
      from_name: "John Doe",
      from_email: "john.doe@example.com",
      amount: 50000,
      active: true,
      notes: "This is a longer note that should demonstrate text wrapping and truncation behavior when columns are resized to be narrow."
    },
    {
      id: 2, 
      occurred_at: "2025-01-14T15:45:00Z",
      subject: "Follow-up Call",
      source: "Phone",
      from_name: "Jane Smith",
      from_email: "jane.smith@company.com",
      amount: null,
      active: false,
      notes: "Brief note"
    },
    {
      id: 3,
      occurred_at: "2025-01-13T09:15:00Z", 
      subject: "Proposal Review",
      source: "Meeting",
      from_name: "Bob Johnson",
      from_email: "bob.johnson@firm.com",
      amount: "75000",
      active: true,
      notes: undefined
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">DataTable Examples</h2>
      
      {/* Basic example */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Basic Table</h3>
        <DataTable 
          rows={exampleData}
          persistKey="example-basic"
        />
      </div>

      {/* With preferred order and custom widths */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">With Preferred Column Order</h3>
        <DataTable 
          rows={exampleData}
          preferredOrder={["occurred_at", "subject", "from_name", "source"]}
          initialWidths={{
            occurred_at: 180,
            subject: 250,
            notes: 300
          }}
          persistKey="example-ordered"
        />
      </div>

      {/* With pagination info */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">With Pagination Info</h3>
        <DataTable 
          rows={exampleData}
          total={150}
          page={1}
          pageSize={25}
          persistKey="example-pagination"
        />
      </div>

      {/* Loading state */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Loading State</h3>
        <DataTable 
          rows={undefined}
          persistKey="example-loading"
        />
      </div>

      {/* Empty state */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Empty State</h3>
        <DataTable 
          rows={[]}
          persistKey="example-empty"
        />
      </div>
    </div>
  );
};

export { DataTableExample };