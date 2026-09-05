import type { Employee } from '../generated/prisma/client'

export type EmployeeNode = Employee & { reports: EmployeeNode[] }

export class OrgChart {

  private readonly reportsBySupervisorId: Map<number, Employee[]>

  // Indexes every employee under their supervisor so the tree costs no extra queries
  constructor(private readonly employees: Employee[]) {

    const reportsBySupervisorId = new Map<number, Employee[]>()

    for (const employee of employees) {

      if (employee.supervisorId === null) continue

      const reports = reportsBySupervisorId.get(employee.supervisorId) ?? []

      reports.push(employee)

      reportsBySupervisorId.set(employee.supervisorId, reports)
    }

    this.reportsBySupervisorId = reportsBySupervisorId

    console.log(`Indexed ${employees.length} employees under ${reportsBySupervisorId.size} supervisors`)
  }

  // Returns the employee with their whole subtree nested beneath them, or null when the ID is unknown
  treeFor(id: number) {

    const root = this.employees.find((employee) => employee.id === id)

    if (root === undefined) return null

    return this.buildNode(root, new Set())
  }

  // Recursively attaches each employee's reports, walking the whole subtree below them
  private buildNode(employee: Employee, visited: Set<number>, depth = 0): EmployeeNode {

    // Indenting by depth makes each level of the recursion visible in the terminal
    const indent = '  '.repeat(depth)

    // A supervisor cycle would otherwise recurse until the stack overflows
    if (visited.has(employee.id)) {

      console.log(`${indent}Cycle detected at employee ${employee.id}, stopping this branch`)

      return { ...employee, reports: [] }
    }

    visited.add(employee.id)

    const directReports = [...(this.reportsBySupervisorId.get(employee.id) ?? [])].sort((a, b) => (
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
    ))

    console.log(`${indent}${employee.firstName} ${employee.lastName} (${directReports.length} direct reports)`)

    const reports = directReports
      .map((report) => this.buildNode(report, visited, depth + 1))

    return { ...employee, reports }
  }
}
