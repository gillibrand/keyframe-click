import { useSetting } from "@app/useSettings";
import { Hint } from "@components/Hint";
import Tail from "@images/tail.svg?react";
import { Layers } from "@timeline/Layers";
import { useEffect, useId, useMemo, useRef } from "react";
import "./ExportDialog.css";
import { genCssKeyframesText, normalizeAtRuleName } from "./output";
import { createPortal } from "react-dom";
import { useSendNote } from "@components/note";

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

/**
 * CSS--or any text--with newlines in it. Each line will be indented by 2 spaces.
 *
 * @param css
 * @returns Indented CSS.
 */
function indent(css: string) {
  return css.replace(/^/gm, "  ");
}

/**
 * Wraps a keyframe list in an at-rule if a name is given.
 *
 * @param keyframes Keyframe list.
 * @param ruleName Optional name of the keyframes at-rule. The user might leave this blank.
 * @returns Keyframe at-rule or the same keyframe list if no name was given.
 */
function generateAtRule(keyframes: string, ruleName?: string) {
  if (!ruleName || ruleName.trim().length === 0) {
    return keyframes;
  } else {
    return `@keyframes ${normalizeAtRuleName(ruleName)} {\n${indent(keyframes)}\n}`;
  }
}

export function ExportDialog({ open, onClose, layers, id }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [ruleName, setAnimationName] = useSetting("ruleName", "my-animation");

  const keyframesHtml = useMemo(() => genCssKeyframesText(layers, true), [layers]);
  const keyframesAtRuleHtml = useMemo(() => generateAtRule(keyframesHtml, ruleName), [ruleName, keyframesHtml]);

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

  const sendNote = useSendNote();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Generate plain text version when copied
    navigator.clipboard.writeText(generateAtRule(genCssKeyframesText(layers), ruleName));
    await animateClose();

    sendNote(ruleName ? `Copied "${ruleName}"` : "Copied");
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
          <input type="text" value={ruleName} onChange={handleNameChange} autoFocus spellCheck={false} />
          <Hint>Leave empty for bare keyframes</Hint>
        </label>

        <div className="stacked-label flex flex-col min-h-px">
          <span id={previewLabelId}>Preview</span>
          <code className="ExportDialog__output" aria-labelledby={previewLabelId}>
            <pre dangerouslySetInnerHTML={{ __html: keyframesAtRuleHtml }}></pre>
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
