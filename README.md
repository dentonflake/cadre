# Overview

Cadre is a REST API for managing employees and the reporting hierarchy between them.

I wanted to learn TypeScript's type system on a problem where types actually earn their keep.

[Software Demo Video](youtube.com/watch?v=DtPJFNzwW-M&feature=youtu.be)

# Development Environment

- **Editor:** VS Code
- **Runtime:** Node.js 24.11.1, pnpm 11.8.0
- **Language:** TypeScript 6.0 in strict mode, run directly via tsx (no compile step)
- **Libraries:** Hono 4.12 (HTTP framework), Zod 4.5 (runtime validation), Prisma 7.8 + @prisma/adapter-pg (PostgreSQL ORM), @hono/node-server, dotenv
- **API testing:** Postman — the collection is committed under postman/

# Useful Websites

- [Hono documentation](https://hono.dev/docs)
- [Prisma documentation](https://www.prisma.io/docs)
- [Zod documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Prisma error reference](https://www.prisma.io/docs/orm/reference/error-reference)

# Future Work

- Add authentication to every endpoint. Currently, there is none.
- `PATCH` blocks an employee supervising themselves, but not A→B→A. The tree walk survives it via a `visited` set, but the bad data can still be written.
- I Would add pagination to `GET /employees`. It is an unbounded `findMany()`. 