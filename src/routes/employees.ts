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

import { OrgChart } from '../lib/org-chart'


const routeEmployees = new Hono()

// Get all employees
routeEmployees.get('/', async (c) => {

  console.log('GET /employees')

  // Fetch all employees
  const [employees, error] = await tryCatch(prisma.employee.findMany())

  // Unhandled errors
  if (error) throw error

  console.log(`GET /employees -> 200, returning ${employees.length} employees`)

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

  console.log(`GET /employees/${id}`)

  // Fetch the employee
  const [employee, error] = await tryCatch(prisma.employee.findUnique({
    where: { id },
  }))

  // Unhandled errors
  if (error) throw error

  // If there is no employee, return early
  if (employee === null) {

    console.log(`GET /employees/${id} -> 404, no employee with that ID`)

    return c.json({
      data: null,
      error: `Unable to find an employee with an ID of ${id}.`,
    }, 404)
  }

  console.log(`GET /employees/${id} -> 200, found ${employee.firstName} ${employee.lastName}`)

  // Return the employee
  return c.json({
    data: employee,
    error: null,
  })
})

// Get an employee with everyone who reports up to them
routeEmployees.get('/:id/tree', zValidator('param', EmployeeIdParamSchema, onValidationError), async (c) => {

  // Query parameter
  const { id } = c.req.valid('param')

  console.log(`GET /employees/${id}/tree`)

  // One query for the whole table, so the tree costs no extra round trips
  const [employees, error] = await tryCatch(prisma.employee.findMany())

  // Unhandled errors
  if (error) throw error

  console.log(`Loaded ${employees.length} employees to build the tree from`)

  const tree = new OrgChart(employees).treeFor(id)

  // If there is no employee, return early
  if (tree === null) {

    console.log(`GET /employees/${id}/tree -> 404, no employee with that ID`)

    return c.json({
      data: null,
      error: `Unable to find an employee with an ID of ${id}.`,
    }, 404)
  }

  console.log(`GET /employees/${id}/tree -> 200, root ${tree.firstName} ${tree.lastName} has ${tree.reports.length} direct reports`)

  // Return the employee with their reports nested beneath them
  return c.json({
    data: tree,
    error: null,
  })
})

// Create employee
routeEmployees.post('/', zValidator('json', CreateEmployeeSchema, onValidationError), async (c) => {

  // Request body
  const data = c.req.valid('json')

  console.log(`POST /employees for ${data.email}`)

  // If supervisorId was provided, the supervisor has to exist
  if (data.supervisorId !== undefined && data.supervisorId !== null) {

    console.log(`Checking that supervisor ${data.supervisorId} exists`)

    const notFound = await supervisorNotFound(c, data.supervisorId)
    if (notFound) return notFound
  }

  // Create the employee
  const [employee, error] = await tryCatch(prisma.employee.create({
    data,
  }))

  // If an employee with the provided email already exists
  if (isPrismaError(error, 'P2002')) {

    console.log(`POST /employees -> 409, ${data.email} is already taken`)

    return c.json({
      data: null,
      error: 'An employee with the provided email already exists.',
    }, 409)
  }

  // Covers the supervisor being deleted between the check above and this write
  if (isPrismaError(error, 'P2003')) {

    console.log(`POST /employees -> 422, supervisor ${data.supervisorId} disappeared mid-request`)

    return c.json({
      data: null,
      error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
    }, 422)
  }

  // Unhandled errors
  if (error) throw error

  console.log(`POST /employees -> 201, created employee ${employee.id}`)

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

    console.log(`PATCH /employees/${id} updating ${Object.keys(data).join(', ')}`)

    // An employee cannot supervise themselves
    if (data.supervisorId === id) {

      console.log(`PATCH /employees/${id} -> 422, an employee cannot supervise themselves`)

      return c.json({
        data: null,
        error: 'The provided supervisor ID cannot be the same as the provided employee\'s ID.',
      }, 422)
    }

    // If supervisorId was provided, the supervisor has to exist
    if (data.supervisorId !== undefined && data.supervisorId !== null) {

      console.log(`Checking that supervisor ${data.supervisorId} exists`)

      const notFound = await supervisorNotFound(c, data.supervisorId)
      if (notFound) return notFound
    }

    // Update employee
    const [employee, error] = await tryCatch(prisma.employee.update({
      where: { id },
      data,
    }))

    // If an employee with the provided ID doesnt exists
    if (isPrismaError(error, 'P2025')) {

      console.log(`PATCH /employees/${id} -> 404, no employee with that ID`)

      return c.json({
        data: null,
        error: `Unable to find an employee with an ID of ${id}.`,
      }, 404)
    }

    // If an employee with the provided email already exists
    if (isPrismaError(error, 'P2002')) {

      console.log(`PATCH /employees/${id} -> 409, ${data.email} is already taken`)

      return c.json({
        data: null,
        error: 'An employee with the provided email already exists.',
      }, 409)
    }

    // Covers the supervisor being deleted between the check above and this write
    if (isPrismaError(error, 'P2003')) {

      console.log(`PATCH /employees/${id} -> 422, supervisor ${data.supervisorId} disappeared mid-request`)

      return c.json({
        data: null,
        error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
      }, 422)
    }

    // Unhandled errors
    if (error) throw error

    console.log(`PATCH /employees/${id} -> 200, updated`)

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

  console.log(`DELETE /employees/${id}`)

  // Delete the employee, which nulls out supervisorId on any of their reports
  const [employee, error] = await tryCatch(prisma.employee.delete({
    where: { id },
  }))

  // If an employee with the provided ID doesnt exists
  if (isPrismaError(error, 'P2025')) {

    console.log(`DELETE /employees/${id} -> 404, no employee with that ID`)

    return c.json({
      data: null,
      error: `Unable to find an employee with an ID of ${id}.`,
    }, 404)
  }

  // Unhandled errors
  if (error) throw error

  console.log(`DELETE /employees/${id} -> 200, deleted ${employee.firstName} ${employee.lastName}`)

  // Return the deleted employee
  return c.json({
    data: employee,
    error: null,
  })
})

export default routeEmployees
