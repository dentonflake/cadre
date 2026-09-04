import { Hono } from "hono"
import { prisma } from "./lib/prisma"

const app = new Hono()

app.get("/", (c) => c.text("Cadre"))

app.get("/employees", async (c) => {
  return c.json(await prisma.employee.findMany())
})

export default app