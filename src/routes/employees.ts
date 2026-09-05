import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import tryCatch from '../utils/try-catch'
import { zValidator } from '@hono/zod-validator'

import {
  CreateEmployeeSchema,
  EmployeeIdParamSchema,
  isPrismaError,
  onValidationError,
  PatchEmployeeSchema,
  supervisorNotFound
} from '../lib/employees'


const routeEmployees = new Hono()

// Get all employees
routeEmployees.get('/', async (c) => {

  // Fetch all employees
  const [employees, error] = await tryCatch(prisma.employee.findMany())

  // Unhandled errors
  if (error) throw error

  // Return all employees
  return c.json({
    data: employees,
    error: null,
  })
})

// Get unique employee
routeEmployees.get('/:id', zValidator('param', EmployeeIdParamSchema, onValidationError), async (c) => {

  // Query parameter
  const { id } = c.req.valid('param')

  // Fetch the employee
  const [employee, error] = await tryCatch(prisma.employee.findUnique({
    where: { id },
  }))

  // Unhandled errors
  if (error) throw error

  // If there is no employee, return early
  if (employee === null) return c.json({
    data: null,
    error: `Unable to find an employee with an ID of ${id}.`,
  }, 404)

  // Return the employee
  return c.json({
    data: employee,
    error: null,
  })
})

// Create employee
routeEmployees.post('/', zValidator('json', CreateEmployeeSchema, onValidationError), async (c) => {

  // Request body
  const data = c.req.valid('json')

  // If supervisorId was provided, the supervisor has to exist
  if (data.supervisorId !== undefined && data.supervisorId !== null) {
    const notFound = await supervisorNotFound(c, data.supervisorId)
    if (notFound) return notFound
  }

  // Create the employee
  const [employee, error] = await tryCatch(prisma.employee.create({
    data,
  }))

  // If an employee with the provided email already exists
  if (isPrismaError(error, 'P2002')) return c.json({
    data: null,
    error: 'An employee with the provided email already exists.',
  }, 409)

  // Covers the supervisor being deleted between the check above and this write
  if (isPrismaError(error, 'P2003')) return c.json({
    data: null,
    error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
  }, 422)

  // Unhandled errors
  if (error) throw error

  // Return the created employee
  return c.json({
    data: employee,
    error: null,
  }, 201)
})

// Update employee
routeEmployees.patch('/:id', zValidator('param', EmployeeIdParamSchema, onValidationError), zValidator('json', PatchEmployeeSchema, onValidationError), async (c) => {

    // Query parameter
    const { id } = c.req.valid('param')

    // Request body
    const data = c.req.valid('json')

    // An employee cannot supervise themselves
    if (data.supervisorId === id) return c.json({
      data: null,
      error: 'The provided supervisor ID cannot be the same as the provided employee\'s ID.',
    }, 422)

    // If supervisorId was provided, the supervisor has to exist
    if (data.supervisorId !== undefined && data.supervisorId !== null) {
      const notFound = await supervisorNotFound(c, data.supervisorId)
      if (notFound) return notFound
    }

    // Update employee
    const [employee, error] = await tryCatch(prisma.employee.update({
      where: { id },
      data,
    }))

    // If an employee with the provided ID doesnt exists
    if (isPrismaError(error, 'P2025')) return c.json({
      data: null,
      error: `Unable to find an employee with an ID of ${id}.`,
    }, 404)

    // If an employee with the provided email already exists
    if (isPrismaError(error, 'P2002')) return c.json({
      data: null,
      error: 'An employee with the provided email already exists.',
    }, 409)

    // Covers the supervisor being deleted between the check above and this write
    if (isPrismaError(error, 'P2003')) return c.json({
      data: null,
      error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
    }, 422)

    // Unhandled errors
    if (error) throw error

    // Return the updated employee
    return c.json({
      data: employee,
      error: null,
    })
  },
)

// Delete employee
routeEmployees.delete('/:id', zValidator('param', EmployeeIdParamSchema, onValidationError), async (c) => {

  // Query parameter
  const { id } = c.req.valid('param')

  // Delete the employee, which nulls out supervisorId on any of their reports
  const [employee, error] = await tryCatch(prisma.employee.delete({
    where: { id },
  }))

  // If an employee with the provided ID doesnt exists
  if (isPrismaError(error, 'P2025')) return c.json({
    data: null,
    error: `Unable to find an employee with an ID of ${id}.`,
  }, 404)

  // Unhandled errors
  if (error) throw error

  // Return the deleted employee
  return c.json({
    data: employee,
    error: null,
  })
})

export default routeEmployees