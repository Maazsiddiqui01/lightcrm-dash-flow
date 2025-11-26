import { useState } from "react";
import { PageErrorBoundary } from "@/components/shared/PageErrorBoundary";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { TemplatesSection } from "@/components/email-builder/TemplatesSection";
import { DraftSection } from "@/components/email-builder/DraftSection";
import { Mail } from "lucide-react";

export function ContactsEmail() {
  return (
    <PageErrorBoundary pageName="Contacts Email">
      <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contacts Email</h1>
            <p className="text-muted-foreground">Manage templates and draft personalized emails</p>
          </div>
        </div>

        {/* Two-Section Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
          {/* Section 1: Templates */}
          <div className="flex flex-col min-h-0">
            <div className="border rounded-lg bg-card shadow-sm flex-1 flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Templates</h2>
                <p className="text-sm text-muted-foreground">Create and manage email templates</p>
              </div>
              <div className="flex-1 min-h-0">
                <TemplatesSection />
              </div>
            </div>
          </div>

          {/* Section 2: Draft Emails */}
          <div className="flex flex-col min-h-0">
            <div className="border rounded-lg bg-card shadow-sm flex-1 flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Draft Emails</h2>
                <p className="text-sm text-muted-foreground">Generate personalized email drafts</p>
              </div>
              <div className="flex-1 min-h-0">
                <DraftSection />
              </div>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
    </PageErrorBoundary>
  );
}