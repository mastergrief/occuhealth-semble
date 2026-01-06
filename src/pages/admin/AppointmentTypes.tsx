import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Clock, Banknote, Pencil, Trash2 } from "lucide-react";

export function AppointmentTypes() {
  const appointmentTypes = useQuery(api.appointmentTypes.listAll, { includeDeleted: true });
  const createType = useMutation(api.appointmentTypes.create);
  const updateType = useMutation(api.appointmentTypes.update);
  const removeType = useMutation(api.appointmentTypes.remove);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingType, setEditingType] = useState<Doc<"appointmentTypes"> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"appointmentTypes"> | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    durationMinutes: 30,
    price: 0,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingType(null);
      setFormData({ name: "", description: "", durationMinutes: 30, price: 0 });
    }
  }, [isDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingType) {
        // Update existing type
        await updateType({
          typeId: editingType._id,
          name: formData.name,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          price: formData.price,
        });
      } else {
        // Create new type
        await createType({
          name: formData.name,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          price: formData.price,
        });
      }
      setFormData({ name: "", description: "", durationMinutes: 30, price: 0 });
      setEditingType(null);
      setIsDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (type: Doc<"appointmentTypes">) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description,
      durationMinutes: type.durationMinutes,
      price: type.price,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTargetId) {
      await removeType({ typeId: deleteTargetId });
      setDeleteTargetId(null);
    }
    setIsDeleteDialogOpen(false);
  };

  const handleToggleActive = async (typeId: Id<"appointmentTypes">, currentStatus: boolean) => {
    await updateType({
      typeId,
      isActive: !currentStatus,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointment Types</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Appointment Type" : "Add Appointment Type"}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? "Update the appointment type details."
                  : "Create a new appointment type that employers can book."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Initial Assessment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Comprehensive health screening"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    step={15}
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (GBP)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? editingType ? "Updating..." : "Creating..."
                    : editingType ? "Update Type" : "Create Type"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Appointment Types ({appointmentTypes?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {appointmentTypes && appointmentTypes.length > 0 ? (
            <div className="space-y-4">
              {appointmentTypes.map((type) => (
                <div
                  key={type._id}
                  className={`p-4 border rounded-lg ${type.deletedAt ? "opacity-50" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{type.name}</p>
                        {type.deletedAt && (
                          <Badge variant="secondary">Archived</Badge>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            type.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {type.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {type.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Banknote className="h-4 w-4" />
                          {type.price > 0 ? `£${type.price.toFixed(2)}` : "Free"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!type.deletedAt && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(type)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteTargetId(type._id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant={type.isActive ? "outline" : "default"}
                            onClick={() => handleToggleActive(type._id, type.isActive)}
                          >
                            {type.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointment types configured</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. If appointments exist for this type,
              it will be archived instead of permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
