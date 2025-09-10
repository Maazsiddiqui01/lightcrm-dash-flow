import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApproveMissingContact } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";

const addContactSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email_address: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  title: z.string().optional(),
  lg_sector: z.string().optional(),
  lg_focus_areas_comprehensive_list: z.string().optional(),
  areas_of_specialization: z.string().optional(),
  notes: z.string().optional(),
});

type AddContactForm = z.infer<typeof addContactSchema>;

interface AddContactModalProps {
  candidate: {
    id: number;
    full_name: string | null;
    email: string;
    organization: string | null;
    status: string;
    created_at: string;
  };
  open: boolean;
  onClose: () => void;
}

export function AddContactModal({ candidate, open, onClose }: AddContactModalProps) {
  const { toast } = useToast();
  const approveMutation = useApproveMissingContact();

  const form = useForm<AddContactForm>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      full_name: candidate.full_name || "",
      email_address: candidate.email,
      organization: candidate.organization || "",
      title: "",
      lg_sector: "",
      lg_focus_areas_comprehensive_list: "",
      areas_of_specialization: "",
      notes: "",
    },
  });

  const onSubmit = async (data: AddContactForm) => {
    try {
      await approveMutation.mutateAsync({
        email: candidate.email,
        contactData: data,
      });
      
      toast({
        title: "Success",
        description: "Contact has been approved and added to your CRM.",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve contact",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Review and complete the contact information before adding to your CRM.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lg_sector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LG Sector</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="areas_of_specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Areas of Specialization</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lg_focus_areas_comprehensive_list"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LG Focus Areas (comma-separated)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Healthcare, Technology, Manufacturing" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={approveMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {approveMutation.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}