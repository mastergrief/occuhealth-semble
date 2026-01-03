import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { EmployeeList } from "@/components/employer/EmployeeList";
import { EmployeeForm } from "@/components/employer/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";

interface LayoutContext {
  employer: Doc<"employers"> | null | undefined;
  isVerified: boolean;
}

export function EmployeesPage() {
  const { employer } = useOutletContext<LayoutContext>();
  const [showForm, setShowForm] = useState(false);

  const patientsResult = useQuery(api.patients.list, employer?._id ? { employerId: employer._id, ...defaultPaginationOpts() } : "skip");
  const patients = patientsResult?.items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <EmployeeList employees={patients ?? []} />

      {showForm && employer && (
        <EmployeeForm employerId={employer._id} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
