import { Hono } from "hono"
import { prisma } from "./lib/prisma"
import employees from "./routes/employees"

const app = new Hono()

app.route('/employees', employees)

export default app