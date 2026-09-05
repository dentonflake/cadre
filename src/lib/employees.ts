import { z } from "zod"

export const EmployeeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const CreateEmployeeSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  supervisorId: z.number().int().nullable().optional(),
})

export const PatchEmployeeSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  supervisorId: z.number().int().nullable().optional(),
}).partial()