import { Dialog, DialogApi, DialogBody, DialogFooter } from "@export/Dialog";
import { Callback } from "@util";
import { PropsWithChildren, useRef } from "react";

interface Props extends PropsWithChildren {
  label: string;
  okLabel: string;
  onOk: Callback;
  onClose?: Callback;
  open: boolean;
}

export function Confirm({ children, label, okLabel, onOk, open, onClose }: Props) {
  const dialogApi = useRef<DialogApi>(null);

  function handleCancel() {
    dialogApi.current?.animateClose();
  }

  async function handleOk() {
    await dialogApi.current?.animateClose();
    onOk();
  }

  function handleClose() {
    if (onClose) onClose();
  }

  return (
    <Dialog label={label} ref={dialogApi} open={open} onClose={handleClose}>
      <DialogBody className="DialogBody--message">{children}</DialogBody>
      <DialogFooter>
        <button className="button is-secondary" onClick={handleCancel}>
          Cancel
        </button>
        {/* Extra leading since this long label can wrap on mobile */}
        <button className="button is-danger py-1 leading-6" onClick={handleOk}>
          {okLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
