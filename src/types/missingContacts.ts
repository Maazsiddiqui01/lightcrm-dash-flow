import { z } from "zod";

export const MissingContactSchema = z.object({
  id: z.number(),
  full_name: z.string().nullable(),      // nullable from DB
  email: z.string().nullable(),
  organization: z.string().nullable(),
  status: z.enum(["pending","approved","rejected","dismissed"]),
  created_at: z.string(),                // ISO string from Supabase
});

export type MissingContact = z.infer<typeof MissingContactSchema>;
export const MissingContactsArraySchema = z.array(MissingContactSchema);