"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteRootCog } from "@/app/myCogs/actions";
import { useRouter } from "next/navigation";

export function DeleteCogButton({ cogId, disabled, className, children }: { cogId: string, disabled?: boolean, className?: string, children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteRootCog(cogId);
    if (res.success) {
      setIsOpen(false);
      router.push("/myCogs/deletedCogs");
    } else {
      alert(res.error || "Failed to delete cog");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        className={className || "w-[25%] bg-destructive hover:bg-destructive/90 text-destructive-foreground shrink-0"}
        onClick={() => setIsOpen(true)}
        disabled={disabled || isDeleting}
        title="Delete Cog"
        aria-label="Delete Cog"
      >
        {children || <Trash2 className="w-4 h-4" />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Delete Cog?</h2>
            
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this Cog?
              <br /><br />
              It will be moved to deletedCogs for now and can be restored later.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
