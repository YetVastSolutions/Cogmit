"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { restoreRootCog } from "@/app/myCogs/actions";
import { useRouter } from "next/navigation";

export function RestoreCogButton({ cogId }: { cogId: string }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();

  const handleRestore = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRestoring(true);
    const res = await restoreRootCog(cogId);
    if (res.success) {
      router.push("/myCogs");
    } else {
      alert(res.error || "Failed to restore cog");
      setIsRestoring(false);
    }
  };

  return (
    <Button 
      variant="outline"
      size="sm"
      className="absolute top-4 right-4 z-10 bg-background hover:bg-muted"
      onClick={handleRestore}
      disabled={isRestoring}
    >
      {isRestoring ? "Restoring..." : "Restore"}
    </Button>
  );
}
