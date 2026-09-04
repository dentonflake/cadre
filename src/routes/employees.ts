import { Hono } from "hono"
import { prisma } from "../lib/prisma"

const employees = new Hono()

employees.get('/', async (c) => {

  return c.json('hi')
})

export default employees