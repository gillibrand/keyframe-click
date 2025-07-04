import { useSetting } from "@app/useSettings";
import { Hint } from "@components/Hint";
import { useNoteApi } from "@components/note/_NoteContext";
import { Segmented, SegmentedButton } from "@components/Segmented";
import { Layers } from "@timeline/Layers";
import { useChildAnimator, wipeInHeight, wipeOutHeight } from "@util/useChildAnimator";
import { useCallback, useId, useMemo, useRef } from "react";
import { Dialog, DialogApi, DialogBody, DialogFooter } from "./Dialog";
import {
  copyToClipboard,
  genKeyframeText,
  generateCssAtRule,
  normalizeAtRuleName,
  normalizeFormat,
} from "./output";
import clsx from "clsx";

interface Props {
  open: boolean;
  onClose: () => void;
  layers: Layers;
  id: string;
  near?: HTMLElement;
}

export function ExportDialog({ open, onClose, layers, id, near }: Props) {
  const dialogApi = useRef<DialogApi>(null);

  const [ruleName, setRuleName] = useSetting("ruleName", "my-animation");
  const [format, setFormat] = useSetting("format", "css");

  const keyframeText = useMemo(() => genKeyframeText(layers, format, true), [layers, format]);
  const keyframesAtRuleHtml = useMemo(
    () => generateCssAtRule(keyframeText, format, ruleName),
    [ruleName, format, keyframeText]
  );

  function handleCancel() {
    dialogApi.current?.animateClose();
  }

  const previewLabelId = useId();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const proposed = e.target.value;
    setRuleName(normalizeAtRuleName(proposed));
  }

  const handleFormatChange = useCallback(
    (newFormat: string) => {
      setFormat(normalizeFormat(newFormat));
    },
    [setFormat]
  );

  const { sendNote } = useNoteApi();

  const handleSubmit = useCallback(async () => {
    const note = await copyToClipboard(layers, format, ruleName);
    await dialogApi.current?.animateClose();
    sendNote(note);
  }, [layers, format, ruleName, dialogApi, sendNote]);

  const { parentRef } = useChildAnimator<HTMLDivElement>("both", {
    animateIn: wipeInHeight,
    animateOut: wipeOutHeight,
  });

  return (
    <Dialog
      label="Copy keyframes"
      open={open}
      onClose={onClose}
      ref={dialogApi}
      onSubmit={handleSubmit}
      id={id}
      near={near}
      className="w-[calc(100%-1rem)] max-w-full text-base sm:w-sm"
    >
      <DialogBody ref={parentRef}>
        <div className="stacked-label">
          <span className="">Format</span>

          <Segmented checkedValue={format} onChange={handleFormatChange}>
            <SegmentedButton value="css" className="basis-1">
              CSS
            </SegmentedButton>
            <SegmentedButton value="js" className="basis-1">
              JavaScript
            </SegmentedButton>
          </Segmented>
        </div>

        {format === "css" && (
          // Wrapper to animate, so remove all m from the parent space-y-4
          <div className="m-0">
            {/* add back the m inside the animated m-0 element for spacing when it's present. */}
            <label className="stacked-label mb-4">
              <span>Rule name</span>
              <input
                className="textbox"
                type="text"
                value={ruleName}
                onChange={handleNameChange}
                // autoFocus
                spellCheck={false}
              />
              <Hint>Leave empty for bare keyframes</Hint>
            </label>
          </div>
        )}

        <div className="stacked-label min-h-px flex-col">
          <span id={previewLabelId}>Preview</span>

          <code
            className={clsx(
              "overflow-auto border-2 border-black bg-neutral-50 p-2",
              "h-96 max-h-[min(40vh,calc(100vh-30rem))] min-h-12"
            )}
            aria-labelledby={previewLabelId}
          >
            <pre dangerouslySetInnerHTML={{ __html: keyframesAtRuleHtml }}></pre>
          </code>
        </div>
      </DialogBody>

      <DialogFooter>
        <button onClick={handleCancel} className="button is-secondary" type="button">
          Cancel
        </button>

        <button className="button is-primary" type="submit">
          Copy
        </button>
      </DialogFooter>
    </Dialog>
  );
}
