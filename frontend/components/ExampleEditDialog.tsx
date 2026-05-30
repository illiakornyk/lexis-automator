"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ExampleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: string;
  initialValue: string;
  onSave: (example: string) => void;
}

export function ExampleEditDialog({
  open,
  onOpenChange,
  word,
  initialValue,
  onSave,
}: ExampleEditDialogProps) {
  const [value, setValue] = useState(initialValue);

  // Reset the field whenever a different card's dialog opens.
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const handleSave = () => {
    onSave(value.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Edit example</DialogTitle>
          <DialogDescription>
            Write your own example sentence for &ldquo;{word}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type an example sentence…"
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
