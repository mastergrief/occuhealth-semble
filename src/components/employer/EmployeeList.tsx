import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Id } from "../../../convex/_generated/dataModel";

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
            <div key={employee._id} className="py-4 flex justify-between items-center">
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
