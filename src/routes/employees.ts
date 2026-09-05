import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { zValidator } from '@hono/zod-validator'
import { CreateEmployeeSchema, EmployeeIdParamSchema, PatchEmployeeSchema } from '../lib/employees'
import tryCatch from '../../utils/try-catch'
import { Prisma } from '../generated/prisma/client'

const employees = new Hono()

// Get all employees
employees.get('/', async (c) => {

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
employees.get('/:id', zValidator('param', EmployeeIdParamSchema), async (c) => {

  // Query parameter
  const { id } = c.req.valid('param')

  // Fetch the employee
  const [employee, error] = await tryCatch(prisma.employee.findUnique({
    where: { id }
  }))
  
  // Unhandled errors
  if (error) throw error

  // If there is no employee, return early
  if (employee === null) return c.json({
    data: employee,
    error: `Unable to find an employee with an ID of ${id}.`,
  }, 404)

  // Return the employee
  return c.json({
    data: employee,
    error: null,
  })
})

// Create employee
employees.post('/', zValidator('json', CreateEmployeeSchema), async (c) => {

  // Request body
  const data = c.req.valid('json')

  // If supervisorId was provided
  if (data.supervisorId !== undefined && data.supervisorId !== null) {

    // Fetch the supervisor
    const supervisor = await prisma.employee.findUnique({
      select: { id: true },
      where: { id: data.supervisorId },
    })

    // If there is no supervisor, return early
    if (!supervisor) return c.json({
      data: supervisor,
      error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
    }, 422)
  }

  // Create the emplyee
  const [employee, error] = await tryCatch(prisma.employee.create({
    data
  }))

  // If an employee with the provided email already exists
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return c.json({
    data: employee,
    error: 'An employee with the provided email already exists.',
  }, 409)

  // Unhandled errors
  if (error) throw error

  // Return the created employee
  return c.json({
    data: employee,
    error: null
  }, 201)
})

// Update employee
employees.patch('/:id', zValidator('param', EmployeeIdParamSchema), zValidator('json', PatchEmployeeSchema), async (c) => {

  // Query parameter
  const { id } = c.req.valid('param')

  // Request body
  const data = c.req.valid('json')

  // If supervisorId was provided
  if (data.supervisorId !== undefined && data.supervisorId !== null) {

    // Fetch the supervisor
    const supervisor = await prisma.employee.findUnique({
      select: { id: true },
      where: { id: data.supervisorId },
    })

    // If there is no supervisor, return early
    if (!supervisor) return c.json({
      data: supervisor,
      error: `Unable to find a supervisor with an ID of ${data.supervisorId}.`,
    }, 422)
  }

  if (data.supervisorId === id) return c.json({
    data: null,
    error: 'The provided supervisor ID cannot be the same as the provided employee\'s ID.',
  })

  // Update employee
  const [employee, error] = await tryCatch(prisma.employee.update({
    where: { id },
    data
  }))

  // If an employee with the provided ID doesnt exists
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return c.json({
    data: null,
    error: `Unable to find an employee with an ID of ${id}.`,
  }, 404)

  // If an employee with the provided email already exists
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return c.json({
    data: employee,
    error: 'An employee with the provided email already exists.',
  }, 409)

  // Unhandled errors
  if (error) throw error

  // Return the updated employee
  return c.json({
    data: employee,
    error: null,
  })
})

// Delete employee
employees.delete('/:id', zValidator('param', EmployeeIdParamSchema), async (c) => {
  
})

export default employees