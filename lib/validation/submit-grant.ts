import { z } from "zod";
import {
  ELIGIBILITY_OPTIONS,
  REGION_OPTIONS,
  SECTOR_OPTIONS,
} from "@/lib/grants/constants";

export const submitGrantSchema = z
  .object({
    title: z.string().trim().min(1, "Grant title is required"),
    organisationName: z.string().trim().min(1, "Organisation name is required"),
    contactEmail: z.string().trim().email("Valid contact email is required"),
    description: z.string().trim().min(1, "Grant description is required"),
    amountMin: z
      .union([z.number().min(0), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
    amountMax: z
      .union([z.number().min(0), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v === "" || v == null ? null : v)),
    deadline: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : null)),
    sectors: z
      .array(z.enum(SECTOR_OPTIONS))
      .min(1, "Select at least one sector"),
    regions: z
      .array(z.enum(REGION_OPTIONS))
      .min(1, "Select at least one region"),
    eligibility: z
      .array(z.enum(ELIGIBILITY_OPTIONS))
      .min(1, "Select at least one applicant type"),
    applicationUrl: z.string().trim().url("Valid application URL is required"),
    additionalNotes: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : null)),
  })
  .superRefine((data, ctx) => {
    if (data.amountMin != null && data.amountMax != null && data.amountMin > data.amountMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum amount cannot exceed maximum amount",
        path: ["amountMax"],
      });
    }

    if (data.deadline) {
      const deadlineDate = new Date(data.deadline);
      if (Number.isNaN(deadlineDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid deadline date",
          path: ["deadline"],
        });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);
        if (deadlineDate < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Deadline cannot be in the past",
            path: ["deadline"],
          });
        }
      }
    }
  });

export type SubmitGrantInput = z.infer<typeof submitGrantSchema>;

export function mapSubmitGrantToRow(data: SubmitGrantInput) {
  return {
    status: "pending",
    source: "provider",
    title: data.title,
    provider: data.organisationName,
    contact_email: data.contactEmail,
    description: data.description,
    amount_min: data.amountMin,
    amount_max: data.amountMax,
    deadline: data.deadline,
    sector: data.sectors,
    region: data.regions,
    eligibility: data.eligibility,
    url: data.applicationUrl,
    additional_notes: data.additionalNotes,
  };
}
