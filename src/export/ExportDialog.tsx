import { Hint } from "@components/Hint";
import { useSendNote } from "@components/note";
import Tail from "@images/tail.svg?react";
import { Layers } from "@timeline/Layers";
import { useEffect, useId, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import "./ExportDialog.css";
import { copyToClipboard, genCssKeyframeList, generateCssAtRule, normalizeAtRuleName } from "./output";
import { useSetting } from "@app/useSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  layers: Layers;
  id: string;
}

const AnimOptions = {
  duration: 96,
  easing: "ease-in-out",
};

export function ExportDialog({ open, onClose, layers, id }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [ruleName, setRuleName] = useSetting("ruleName", "my-animation");

  const keyframesHtml = useMemo(() => genCssKeyframeList(layers, true), [layers]);
  const keyframesAtRuleHtml = useMemo(() => generateCssAtRule(keyframesHtml, ruleName), [ruleName, keyframesHtml]);

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
            scale: [0.5, 1],
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
    const dialog = ref.current;
    if (!dialog) return;

    dialog.classList.remove("is-open");

    await dialog.animate(
      {
        scale: [1, 0.5],
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
    setRuleName(normalizeAtRuleName(proposed));
  }

  const sendNote = useSendNote();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    const note = copyToClipboard(layers, ruleName);
    await animateClose();
    sendNote(note);
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

      <form className="ExportDialog__form [ flex flex-col ] [ Xstack ]" onSubmit={handleSubmit}>
        <div className="flex flex-col min-h-px stack p-4">
          <h2 id={dialogLabelId} className="select-none">
            Copy keyframes
          </h2>

          <label className="stacked-label">
            <span>Rule name</span>
            <input
              className="textbox"
              type="text"
              value={ruleName}
              onChange={handleNameChange}
              autoFocus
              spellCheck={false}
            />
            <Hint>Leave empty for bare keyframes</Hint>
          </label>

          <div className="stacked-label flex flex-col min-h-px grow">
            <span id={previewLabelId}>Preview</span>
            <code className="ExportDialog__output" aria-labelledby={previewLabelId}>
              <pre dangerouslySetInnerHTML={{ __html: keyframesAtRuleHtml }}></pre>
            </code>
          </div>
        </div>

        <footer className="ExportDialog__footer flex justify-end gap-4 mt-4">
          <button onClick={animateClose} className="button is-secondary" type="button">
            Cancel
          </button>
          <button className="button is-primary" type="submit">
            Copy
          </button>
        </footer>
      </form>
    </dialog>,
    document.body
  );
}
