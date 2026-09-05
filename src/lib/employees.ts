import { z } from 'zod'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'
import tryCatch from '../utils/try-catch'

type ValidationResult<T> =
  | { success: true }
  | { success: false, error: z.core.$ZodError<T> }

export const EmployeeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const CreateEmployeeSchema = z.object({
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  supervisorId: z.number().int().positive().nullable().optional(),
})

export const PatchEmployeeSchema = CreateEmployeeSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    error: 'At least one field must be provided.',
  })

// Keeps zValidator's 400s in the same { data, error } envelope as every other response
export const onValidationError = <T>(result: ValidationResult<T>, c: Context) => {
  if (result.success) return

  return c.json({
    data: null,
    error: z.prettifyError(result.error),
  }, 400)
}

export const isPrismaError = (error: unknown, code: string) => (
  error instanceof Prisma.PrismaClientKnownRequestError
  && error.code === code
)

// Returns a 422 response when the supervisor is missing, otherwise null
export const supervisorNotFound = async (c: Context, supervisorId: number) => {

  const [supervisor, error] = await tryCatch(prisma.employee.findUnique({
    select: { id: true },
    where: { id: supervisorId },
  }))

  // Unhandled errors
  if (error) throw error

  if (supervisor) return null

  return c.json({
    data: null,
    error: `Unable to find a supervisor with an ID of ${supervisorId}.`,
  }, 422)
}