"use client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Overlay";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-[440px]"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink-2">{body}</p>
    </Modal>
  );
}
