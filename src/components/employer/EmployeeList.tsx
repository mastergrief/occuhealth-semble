import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Display component for employer's employee directory.
 *
 * Renders a list of employees with their contact information and job details.
 * Shows an empty state message when no employees exist.
 *
 * @component
 * @example
 * ```tsx
 * <EmployeeList employees={employeeData} />
 * ```
 *
 * @param props.employees - Array of employee records to display
 */

interface Employee {
  _id: Id<"patients">;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: string;
}

interface EmployeeListProps {
  employees: Employee[];
}

interface EmployeeRowProps {
  employee: Employee;
}

const EmployeeRow = memo(function EmployeeRow({ employee }: EmployeeRowProps) {
  return (
    <div className="py-4 flex justify-between items-center">
      <div>
        <p className="font-medium">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="text-sm text-muted-foreground">{employee.email}</p>
      </div>
      <div className="text-right">
        {employee.jobTitle && <p className="text-sm">{employee.jobTitle}</p>}
        {employee.department && (
          <p className="text-sm text-muted-foreground">{employee.department}</p>
        )}
      </div>
    </div>
  );
});

export function EmployeeList({ employees }: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No employees added yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {employees.map((employee) => (
            <EmployeeRow key={employee._id} employee={employee} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
