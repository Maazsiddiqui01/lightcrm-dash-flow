import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { FocusAreaSelect } from "@/components/shared/FocusAreaSelect";
import { useApproveMissingContact } from "@/hooks/useMissingContacts";
import { useToast } from "@/hooks/use-toast";
import { useGroups } from "@/hooks/useGroups";
import { useSectors } from "@/hooks/useLookups";
import { supabase } from "@/integrations/supabase/client";

const addContactSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email_address: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  title: z.string().optional(),
  lg_sector: z.string().optional(),
  lg_focus_areas: z.array(z.string()).min(1, "At least one focus area is required"),
  areas_of_specialization: z.string().optional(),
  notes: z.string().optional(),
  phone: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  x_twitter_url: z.string().url().optional().or(z.literal('')),
  url_to_online_bio: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  lg_lead: z.string().optional(),
  lg_assistant: z.string().optional(),
  delta_type: z.enum(["Email", "Meeting", "none", ""]).optional(),
  delta: z.string().optional(),
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

// Hook to get group member counts
const useGroupMemberCounts = () => {
  return useQuery({
    queryKey: ['group-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_group_memberships')
        .select('group_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(membership => {
        counts[membership.group_id] = (counts[membership.group_id] || 0) + 1;
      });
      
      return counts;
    },
    staleTime: 1000 * 60,
  });
};

export function AddContactModal({ candidate, open, onClose }: AddContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const approveMutation = useApproveMissingContact();
  const groupsQuery = useGroups();
  const sectorsQuery = useSectors();
  const memberCountsQuery = useGroupMemberCounts();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [emailRole, setEmailRole] = useState<'to' | 'cc' | 'bcc'>('to');
  const [optionalOpen, setOptionalOpen] = useState(false);

  const form = useForm<AddContactForm>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      full_name: candidate.full_name || "",
      email_address: candidate.email,
      organization: candidate.organization || "",
      title: "",
      lg_sector: "",
      lg_focus_areas: [],
      areas_of_specialization: "",
      notes: "",
      phone: "",
      linkedin_url: "",
      x_twitter_url: "",
      url_to_online_bio: "",
      category: "",
      lg_lead: "",
      lg_assistant: "",
      delta_type: "",
      delta: "",
    },
  });

  // Auto-fill sector when first focus area is selected
  const focusAreas = form.watch("lg_focus_areas");
  const currentSector = form.watch("lg_sector");
  
  useEffect(() => {
    if (focusAreas.length > 0 && !currentSector && sectorsQuery.data) {
      // Get sector from first focus area's meta
      const firstFocusArea = focusAreas[0];
      // This is a simplified auto-fill - in production, you'd look up the sector for this focus area
      // For now, we'll skip this to keep it simple
    }
  }, [focusAreas, currentSector, sectorsQuery.data, form]);

  const onSubmit = async (data: AddContactForm) => {
    try {
      await approveMutation.mutateAsync({
        email: candidate.email,
        contactData: {
          full_name: data.full_name,
          email_address: data.email_address,
          organization: data.organization,
          title: data.title,
          lg_sector: data.lg_sector,
          lg_focus_areas: data.lg_focus_areas,
          areas_of_specialization: data.areas_of_specialization,
          notes: data.notes,
          phone: data.phone,
          linkedin_url: data.linkedin_url,
          x_twitter_url: data.x_twitter_url,
          url_to_online_bio: data.url_to_online_bio,
          category: data.category,
          lg_lead: data.lg_lead,
          lg_assistant: data.lg_assistant,
          delta_type: data.delta_type === "none" ? undefined : data.delta_type,
          delta: data.delta,
        },
        groupId: selectedGroupId,
        emailRole: emailRole,
      });
      
      toast({
        title: "Success",
        description: "Contact has been approved and added to your CRM.",
      });
      
      form.reset();
      setSelectedGroupId(null);
      setEmailRole('to');
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Review and complete the contact information before adding to your CRM.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Core Information */}
            <div className="space-y-4">
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
                        <Input {...field} placeholder="e.g., Healthcare" />
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

              {/* Focus Areas */}
              <FormField
                control={form.control}
                name="lg_focus_areas"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FocusAreaSelect
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select focus areas"
                      />
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
                      <Textarea {...field} rows={3} placeholder="Add any relevant notes..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Group Assignment */}
            <div className="space-y-4 border-t pt-4">
              <Label>Assign to Existing Group (Optional)</Label>
              <Select
                value={selectedGroupId || 'none'}
                onValueChange={(value) => setSelectedGroupId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Group</SelectItem>
                  {groupsQuery.data?.map((group) => {
                    const memberCount = memberCountsQuery.data?.[group.id] || 0;
                    return (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({memberCount} member{memberCount !== 1 ? 's' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedGroupId && (
                <div className="space-y-2">
                  <Label>Email Role in Group</Label>
                  <RadioGroup value={emailRole} onValueChange={(v) => setEmailRole(v as any)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="to" id="role-to" />
                      <Label htmlFor="role-to" className="font-normal cursor-pointer">To (Primary Recipient)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cc" id="role-cc" />
                      <Label htmlFor="role-cc" className="font-normal cursor-pointer">CC (Copied)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bcc" id="role-bcc" />
                      <Label htmlFor="role-bcc" className="font-normal cursor-pointer">BCC (Hidden Copy)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>

            {/* Optional Fields - Collapsible */}
            <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen} className="border-t pt-4">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="flex items-center gap-2 w-full justify-between">
                  <span>Additional Information (Optional)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${optionalOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category/Profession</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Investor, Advisor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/in/..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="x_twitter_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X (Twitter) URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://x.com/..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url_to_online_bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Online Bio URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lg_lead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LG Lead</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lg_assistant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LG Assistant</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="delta_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delta Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Meeting">Meeting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="delta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Lag (Days)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="e.g., 30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

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