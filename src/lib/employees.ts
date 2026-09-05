import { z } from 'zod'
import type { Context } from 'hono'
import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'
import type { Employee } from '../generated/prisma/client'
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

  console.log(`Validation failed -> 400: ${z.prettifyError(result.error).replace(/\n/g, ' ')}`)

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

  if (supervisor) {

    console.log(`Supervisor ${supervisorId} exists`)

    return null
  }

  console.log(`Supervisor ${supervisorId} does not exist -> 422`)

  return c.json({
    data: null,
    error: `Unable to find a supervisor with an ID of ${supervisorId}.`,
  }, 422)
}

export type EmployeeNode = Employee & { reports: EmployeeNode[] }

// Indexes every employee under their supervisor so the tree can be built without more queries
export const groupBySupervisorId = (employees: Employee[]) => {

  const reportsBySupervisorId = new Map<number, Employee[]>()

  for (const employee of employees) {

    if (employee.supervisorId === null) continue

    const reports = reportsBySupervisorId.get(employee.supervisorId) ?? []

    reports.push(employee)
    
    reportsBySupervisorId.set(employee.supervisorId, reports)
  }

  console.log(`Indexed ${employees.length} employees under ${reportsBySupervisorId.size} supervisors`)

  return reportsBySupervisorId
}

const byName = (a: Employee, b: Employee) => (
  a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
)

// Recursively attaches each employee's reports, walking the whole subtree below them
export const buildReportTree = (employee: Employee, reportsBySupervisorId: Map<number, Employee[]>, visited = new Set<number>(), depth = 0): EmployeeNode => {

  // Indenting by depth makes each level of the recursion visible in the terminal
  const indent = '  '.repeat(depth)

  // A supervisor cycle would otherwise recurse until the stack overflows
  if (visited.has(employee.id)) {

    console.log(`${indent}Cycle detected at employee ${employee.id}, stopping this branch`)

    return { ...employee, reports: [] }
  }

  visited.add(employee.id)

  const directReports = [...(reportsBySupervisorId.get(employee.id) ?? [])].sort(byName)

  console.log(`${indent}${employee.firstName} ${employee.lastName} (${directReports.length} direct reports)`)

  const reports = directReports
    .map((report) => buildReportTree(report, reportsBySupervisorId, visited, depth + 1))

  return { ...employee, reports }
}