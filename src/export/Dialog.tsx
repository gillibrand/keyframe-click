import Tail from "@images/tail.svg?react";
import { Callback } from "@util";
import { cx } from "@util/cx";
import {
  forwardRef,
  PropsWithChildren,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import "./Dialog.css";

interface DialogProps extends PropsWithChildren {
  label: string;
  hideLabel?: boolean;
  open: boolean;
  onClose?: Callback;
  /** @returns `true` to auto close the dialog. Any other value is ignore and the caller must close manually. */
  onSubmit?: () => unknown;
  id?: string;

  /**
   * The button that opened this dialog and it should be placed near. Assume the button is on the end side of the page
   * for now.
   */
  near?: HTMLElement;
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

/**
 * A generic dialog component. Pass children to show. Use `DialogBody` and `DialogFooter` for consistent styling. Open
 * like a popover with a tail near the opening button.
 */
export const Dialog = forwardRef<DialogApi, DialogProps>(function Dialog(
  { open, onClose, label, hideLabel, children, onSubmit, id, near },
  apiRef
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.body.classList.toggle("is-dialog-open", open);
    return () => document.body.classList.remove("is-dialog-open");
  }, [open]);

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
    // TODO: isn't this called onclose already?
    if (onClose) onClose();
  }, [onClose]);

  useImperativeHandle(apiRef, () => {
    return {
      animateClose,
    };
  }, [animateClose]);

  useLayoutEffect(
    function animateOnOpenClose() {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (!open) {
        animateClose();
      } else {
        dialog.showModal();

        // Manually autofocus after making it visible in the dom. React removes the autofocus
        // attribute so we need to use our own
        const el = dialog.querySelector("[data-autofocus]") as HTMLElement;
        if (el) el.focus();

        if (near) {
          const r = near.getBoundingClientRect();
          dialog.style.top = `${r.top + r.height + 10}px`;
          dialog.style.right = `${window.innerWidth - r.right}px`;
          dialog.style.left = "auto";
        }

        dialog.classList.add("is-open");
        const anim = dialog.animate(
          {
            scale: [0.9, 1],
            opacity: [0.4, 1],
          },
          AnimOptions
        );

        return () => {
          anim.cancel();
        };
      }
    },
    [open, animateClose, near]
  );

  /** Intercept and prevent a cancel. Run animated close instead. */
  function handleCancel(e: React.UIEvent<HTMLDialogElement>) {
    e.preventDefault();
    animateClose();
  }

  const mouseDownTarget = useRef<HTMLElement>();

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownTarget.current = e.target as HTMLElement;
  }

  /** Close the dialog when clicking on the backdrop. */
  function handleLightDismiss(e: React.MouseEvent<HTMLDialogElement>) {
    // Check if the click target is the dialog itself (backdrop click)
    if (mouseDownTarget.current === e.currentTarget) {
      animateClose();
    }
  }

  const dialogLabelId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!onSubmit) {
      // Why get here?
      animateClose();
      return;
    }

    if (onSubmit() === true) {
      animateClose();
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={cx("Dialog", { "origin-top-right": near, "origin-top-center": !near })}
      onCancel={handleCancel}
      onClick={handleLightDismiss}
      onMouseDown={handleMouseDown}
      aria-labelledby={dialogLabelId}
      id={id}
      style={{
        margin: near ? 0 : undefined,
      }}
    >
      {near && <Tail className="Dialog__tail" />}

      <form action="dialog" className="[ flex flex-col ] stack" onSubmit={handleSubmit}>
        <header className={cx("px-4 pt-4", { "sr-only": hideLabel })}>
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
export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(function DialogBody(
  { children, className },
  ref
) {
  return (
    <div ref={ref} className={cx("mx-4 flex-col min-h-px stack", className)}>
      {children}
    </div>
  );
});

/** A footer component to use in a dialog. */
export function DialogFooter({ children }: PropsWithChildren) {
  return <footer className="Dialog__footer flex justify-end gap-4 p-4">{children}</footer>;
}
