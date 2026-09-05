import { Hono } from "hono"
import routeEmployees from "./routes/employees"
import { HTTPException } from "hono/http-exception"

const app = new Hono()

// Employee routes
app.route('/employees', routeEmployees)

// Error handler
app.onError((error, c) => {

  // Hono's own HTTP errors already carry a status
  if (error instanceof HTTPException) {

    console.log(`HTTP error -> ${error.status}: ${error.message}`)

    return c.json({
      data: null,
      error: error.message
    }, error.status)
  }

  console.log(`Unhandled error on ${c.req.method} ${c.req.path} -> 500`)
  console.error(error)

  return c.json({
    data: null,
    error: "Internal server error"
  }, 500)
})

// Not found handler
app.notFound((c) => {

  console.log(`No route matches ${c.req.method} ${c.req.path} -> 404`)

  return c.json({
    data: null,
    error: "Not found"
  }, 404)
})

export default app