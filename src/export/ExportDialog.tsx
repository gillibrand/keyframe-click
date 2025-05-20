import { useSetting } from "@app/useSettings";
import { Hint } from "@components/Hint";
import { useNoteApi } from "@components/note/_NoteContext";
import { Segmented, SegmentedButton } from "@components/Segmented";
import { Layers } from "@timeline/Layers";
import { useChildAnimator, wipeInHeight, wipeOutHeight } from "@util/useChildAnimator";
import { useCallback, useId, useMemo, useRef } from "react";
import { Dialog, DialogApi, DialogBody, DialogFooter } from "./Dialog";
import "./ExportDialog.css";
import { copyToClipboard, genKeyframeText, generateCssAtRule, normalizeAtRuleName, normalizeFormat } from "./output";

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
    const note = copyToClipboard(layers, format, ruleName);
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
    >
      <DialogBody ref={parentRef}>
        <div className="stacked-label">
          <span>Format</span>

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
          <div className="mt-0">
            <label className="stacked-label mt-stack">
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

        <div className="stacked-label flex-col min-h-px  ">
          <span id={previewLabelId}>Preview</span>
          <code className="code ExportDialog__output" aria-labelledby={previewLabelId}>
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
