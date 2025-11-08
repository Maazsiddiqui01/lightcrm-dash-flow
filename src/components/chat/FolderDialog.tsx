import { useState, useEffect } from "react";
import { Folder, Users, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChatFolder } from "@/hooks/useChatFolders";
import { cn } from "@/lib/utils";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (folder: any) => Promise<void>;
  folder?: ChatFolder;
  mode: "create" | "edit";
}

const icons = [
  { name: "folder", Icon: Folder, label: "Folder" },
  { name: "users", Icon: Users, label: "Contacts" },
  { name: "briefcase", Icon: Briefcase, label: "Business" },
];

const colors = [
  { name: "Blue", value: "#0D6EFD" },
  { name: "Green", value: "#198754" },
  { name: "Purple", value: "#6F42C1" },
  { name: "Red", value: "#DC3545" },
  { name: "Orange", value: "#FD7E14" },
  { name: "Teal", value: "#20C997" },
  { name: "Gray", value: "#6C757D" },
];

export function FolderDialog({
  open,
  onOpenChange,
  onSave,
  folder,
  mode,
}: FolderDialogProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState("#6F42C1");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedIcon(folder.icon);
      setSelectedColor(folder.color);
    } else {
      setName("");
      setSelectedIcon("folder");
      setSelectedColor("#6F42C1");
    }
  }, [folder, open]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      if (mode === "edit" && folder) {
        await onSave({
          id: folder.id,
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        await onSave({
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Folder" : "Edit Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Contacts, Opportunities"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2">
              {icons.map(({ name: iconName, Icon, label }) => (
                <button
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors hover:bg-accent",
                    selectedIcon === iconName
                      ? "border-primary bg-accent"
                      : "border-border"
                  )}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map(({ name: colorName, value }) => (
                <button
                  key={value}
                  onClick={() => setSelectedColor(value)}
                  className={cn(
                    "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                    selectedColor === value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  )}
                  style={{ backgroundColor: value }}
                  title={colorName}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
