import Tail from "@images/tail.svg?react";
import { Callback } from "@util";
import { forwardRef, PropsWithChildren, useCallback, useEffect, useId, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import "./Dialog.css";
import { cx } from "@util/cx";

interface DialogProps extends PropsWithChildren {
  label: string;
  open: boolean;
  onClose?: Callback;
  onSubmit?: Callback;
  id: string;
}

const AnimOptions = {
  duration: 111,
  easing: "ease-out",
};

/** Functions to interact with the dialog. Pass in a ref to get an instance. */
export interface DialogApi {
  /**
   * Closes the dialog with an animation. The dialog will be hidden, but still in the DOM unless the caller removes it.
   *
   * @returns Resolves once closed.
   */
  animateClose: () => Promise<void>;
}

/** A generic dialog component. Pass children to show. Use `DialogBody` and `DialogFooter` for consistent styling. */
export const Dialog = forwardRef<DialogApi, DialogProps>(function Dialog(
  { open, onClose, label, children, onSubmit, id },
  apiRef
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  /** Animates the dialog out and closes it. */
  const animateClose = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.classList.remove("is-open");

    await dialog.animate(
      {
        scale: [1, 0.9],
        opacity: [1, 0],
      },
      AnimOptions
    ).finished;

    dialog.close();
    if (onClose) onClose();
  }, [onClose]);

  useImperativeHandle(apiRef, () => {
    return {
      animateClose,
    };
  }, [animateClose]);

  useEffect(
    function animateOnOpenClose() {
      console.info(">>> eff", open);
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (!open) {
        animateClose();
      } else {
        dialog.showModal();

        dialog.classList.add("is-open");
        dialog.animate(
          {
            scale: [0.9, 1],
            opacity: [0.4, 1],
          },
          AnimOptions
        );
      }
    },
    [open, animateClose]
  );

  /** Intercept and prevent a cancel. Run animated close instead. */
  function handleCancel(e: React.UIEvent<HTMLDialogElement>) {
    e.preventDefault();
    animateClose();
  }

  /** Close the dialog when clicking on the backdrop. */
  function handleLightDismiss(e: React.MouseEvent<HTMLDialogElement>) {
    // Check if the click target is the dialog itself (backdrop click)
    if (e.target === e.currentTarget) {
      animateClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (onSubmit) onSubmit();
    await animateClose();
  }

  const dialogLabelId = useId();

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="Dialog origin-top-right"
      onCancel={handleCancel}
      onClick={handleLightDismiss}
      aria-labelledby={dialogLabelId}
      id={id}
    >
      <Tail className="Dialog__tail" />

      <form action="dialog" className="[ flex flex-col ] stack" onSubmit={handleSubmit}>
        <header className="px-4 pt-4">
          <h2 id={dialogLabelId}>{label}</h2>
        </header>

        {children}
      </form>
    </dialog>,
    document.body
  );
});

interface DialogBodyProps extends PropsWithChildren {
  className?: string;
}

/** A body element to use in a dialog. */
export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cx("mx-4 flex-col min-h-px stack", className)}>{children}</div>;
}

/** A footer component to use in a dialog. */
export function DialogFooter({ children }: PropsWithChildren) {
  return <footer className="Dialog__footer flex justify-end gap-4 p-4">{children}</footer>;
}
