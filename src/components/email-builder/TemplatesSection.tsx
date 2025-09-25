import { useState } from "react";
import { TemplatesList } from "./TemplatesList";
import { TemplateEditor } from "./TemplateEditor";
import { EmailTemplate } from "@/hooks/useEmailTemplates";

export function TemplatesSection() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  return (
    <div className="flex h-full">
      {/* Left: Templates List */}
      <div className="w-1/2 border-r p-4">
        <TemplatesList 
          selectedTemplate={selectedTemplate}
          onTemplateSelect={setSelectedTemplate}
        />
      </div>

      {/* Right: Template Editor */}
      <div className="w-1/2 p-4">
        <TemplateEditor 
          template={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
        />
      </div>
    </div>
  );
}