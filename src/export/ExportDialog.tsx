import { useSetting } from "@app/useSettings";
import { Hint } from "@components/Hint";
import Tail from "@images/tail.svg?react";
import { Layers } from "@timeline/Layers";
import { useEffect, useId, useMemo, useRef } from "react";
import "./ExportDialog.css";
import { genCssKeyframesText, normalizeAtRuleName } from "./output";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  layers: Layers;
  id: string;
}

const AnimOptions = {
  duration: 64,
  easing: "ease-in-out",
};

/**
 * CSS--or any text--with newlines in it. Each line will be indented by 2 spaces.
 *
 * @param css
 * @returns Indented CSS.
 */
function indent(css: string) {
  return css.replace(/^/gm, "  ");
}

export function ExportDialog({ open, onClose, layers, id }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [ruleName, setAnimationName] = useSetting("ruleName", "my-animation");
  const keyframesText = useMemo(() => genCssKeyframesText(layers), [layers]);

  const keyframesResult = useMemo(() => {
    if (ruleName.trim().length === 0) {
      return keyframesText;
    } else {
      return `@keyframes ${normalizeAtRuleName(ruleName)} {\n${indent(keyframesText)}\n}`;
    }
  }, [ruleName, keyframesText]);

  useEffect(
    function animateOnOpenClose() {
      const dialog = ref.current;
      if (!dialog) return;

      if (!open) {
        animateClose();
      } else {
        dialog.showModal();

        dialog.classList.add("is-open");
        dialog.animate(
          {
            scale: [0.9, 1],
            opacity: [0, 1],
          },
          AnimOptions
        );
      }
    },
    [open]
  );

  /** Animates the dialog out and closes it. */
  async function animateClose() {
    console.warn("close");
    const dialog = ref.current;
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
  }

  /** Intercept and prevent a cancel. Run animated close instead. */
  function handleCancel(e: React.UIEvent<HTMLDialogElement>) {
    e.preventDefault();
    animateClose();
  }

  const dialogLabelId = useId();
  const previewLabelId = useId();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const proposed = e.target.value;
    setAnimationName(normalizeAtRuleName(proposed));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard.writeText(keyframesResult);
    animateClose();
  }

  return createPortal(
    <dialog
      ref={ref}
      onClose={onClose}
      className="ExportDialog origin-top-right"
      onCancel={handleCancel}
      closedby="any"
      aria-labelledby={dialogLabelId}
      id={id}
    >
      <Tail className="ExportDialog__tail" />

      <form className="ExportDialog__body [ flex flex-col ] [ stack ]" onSubmit={handleSubmit}>
        <h2 id={dialogLabelId}>Copy keyframes</h2>

        <label className="stacked-label">
          <span>Rule name</span>
          <input type="text" value={ruleName} onChange={handleNameChange} autoFocus />
          <Hint>Leave empty for bare keyframes</Hint>
        </label>

        <div className="stacked-label flex flex-col min-h-px">
          <span id={previewLabelId}>Preview</span>
          <code className="ExportDialog__output" aria-labelledby={previewLabelId}>
            <pre>{keyframesResult}</pre>
          </code>
        </div>

        <footer className="flex justify-end gap-4 mt-4">
          <button onClick={animateClose} className="push-button" type="button">
            Cancel
          </button>
          <button className="push-button is-default" type="submit">
            Copy
          </button>
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
