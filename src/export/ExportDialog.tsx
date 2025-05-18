import { useSetting } from "@app/useSettings";
import { Hint } from "@components/Hint";
import { useNoteApi } from "@components/note/_NoteContext";
import { Layers } from "@timeline/Layers";
import { useCallback, useId, useMemo, useRef } from "react";
import { Dialog, DialogApi, DialogBody, DialogFooter } from "./Dialog";
import "./ExportDialog.css";
import { copyToClipboard, genCssKeyframeList, generateCssAtRule, normalizeAtRuleName } from "./output";

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

  const keyframesHtml = useMemo(() => genCssKeyframeList(layers, true), [layers]);
  const keyframesAtRuleHtml = useMemo(() => generateCssAtRule(keyframesHtml, ruleName), [ruleName, keyframesHtml]);

  function handleCancel() {
    dialogApi.current?.animateClose();
  }

  const previewLabelId = useId();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const proposed = e.target.value;
    setRuleName(normalizeAtRuleName(proposed));
  }

  const { sendNote } = useNoteApi();

  const handleSubmit = useCallback(async () => {
    const note = copyToClipboard(layers, ruleName);
    await dialogApi.current?.animateClose();
    sendNote(note);
  }, [layers, ruleName, dialogApi, sendNote]);

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
      <DialogBody>
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
