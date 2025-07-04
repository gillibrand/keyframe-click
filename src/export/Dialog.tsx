import Tail from "@images/tail.svg?react";
import { Callback } from "@util";
import clsx from "clsx";
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

interface DialogProps extends PropsWithChildren {
  label: string;
  hideLabel?: boolean;
  open: boolean;
  onClose?: Callback;
  /**
   * @returns `true` to auto close the dialog. Any other value is ignore and the caller must close
   *   manually.
   */
  onSubmit?: () => unknown;
  id?: string;

  /**
   * The button that opened this dialog and it should be placed near. Assume the button is on the
   * end side of the page for now.
   */
  near?: HTMLElement;

  className?: string;
}

const AnimOptions = {
  duration: 111,
  easing: "ease-out",
};

/** Functions to interact with the dialog. Pass in a ref to get an instance. */
export interface DialogApi {
  /**
   * Closes the dialog with an animation. The dialog will be hidden, but still in the DOM unless the
   * caller removes it.
   *
   * @returns Resolves once closed.
   */
  animateClose: () => Promise<void>;
}

function isSmallScreen() {
  return window.innerWidth < 750;
}

/**
 * A generic dialog component. Pass children to show. Use `DialogBody` and `DialogFooter` for
 * consistent styling. Open like a popover with a tail near the opening button.
 */
export const Dialog = forwardRef<DialogApi, DialogProps>(function Dialog(
  { open, onClose, label, hideLabel, children, onSubmit, id, near, className },
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

        if (!isSmallScreen() && near) {
          const r = near.getBoundingClientRect();
          dialog.style.top = `${r.top + r.height + 10}px`;
          dialog.style.right = `${window.innerWidth - r.right}px`;
          dialog.style.left = "auto";
        }

        dialog.classList.add("is-open");
        const anim = dialog.animate(
          {
            scale: [0.9, 1],
            opacity: [0, 1],
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

  const isSmall = isSmallScreen();

  console.info(">>> near", near);
  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={handleCancel}
      onClick={handleLightDismiss}
      onMouseDown={handleMouseDown}
      aria-labelledby={dialogLabelId}
      id={id}
      style={{
        margin: !isSmall && near ? 0 : undefined,
      }}
      className={clsx(
        // Layout and appearance
        "z-dialog bg-neo-white border-neo fixed overflow-visible rounded-2xl p-0 text-lg sm:text-sm",
        // Shadow when open with white outline
        "shadow-[4px_4px_0_0_black,0_0_0_1px_white,4px_4px_0_1px_white]",
        // Popover origin
        near ? "origin-top-right" : "origin-top-center",
        "backdrop:bg-black/20 backdrop:opacity-0 backdrop:transition-opacity backdrop:duration-150 [&.is-open::backdrop]:opacity-100",
        className
      )}
    >
      {!isSmallScreen() && near && (
        <Tail className="text-neo-white absolute -top-4 right-8 drop-shadow-[0_-2px_black]" />
      )}

      <form action="dialog" className="flex flex-col space-y-4" onSubmit={handleSubmit}>
        <header className={clsx("px-4 pt-4", { "sr-only": hideLabel })}>
          <h2 className="text-lg font-bold" id={dialogLabelId}>
            {label}
          </h2>
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
    <div ref={ref} className={clsx("mx-4 min-h-px flex-col space-y-4", className)}>
      {children}
    </div>
  );
});

/** A footer component to use in a dialog. */
export function DialogFooter({ children }: PropsWithChildren) {
  return <footer className="flex justify-end gap-4 p-4">{children}</footer>;
}
