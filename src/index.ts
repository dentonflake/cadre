import { Hono } from "hono"
import employees from "./routes/employees"
import { HTTPException } from "hono/http-exception"

const app = new Hono()

// Employee routes
app.route('/employees', employees)

// Error handler
app.onError((error, c) => {

  // Hono's own HTTP errors already carry a status
  if (error instanceof HTTPException) return c.json({
    data: null,
    error: error.message
  }, error.status)

  console.error(error)

  return c.json({
    data: null,
    error: "Internal server error"
  }, 500)
})

// Not found handler
app.notFound((c) => c.json({
  data: null,
  error: "Not found"
}, 404))

export default app