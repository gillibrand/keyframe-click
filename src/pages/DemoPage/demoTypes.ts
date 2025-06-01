import { TimeUnit } from "@app/useSettings";
import { Graphic } from "@preview/previewTypes";
import { RealLayer } from "@timeline/Layers";

/**
 * The format of a saved JSON demo. Note that some props are optional, so should just not be set if missing. Not all are
 * needed for all demos.
 */
export interface SavedDemo {
  previewDurationTime?: number;
  previewDurationUnit?: TimeUnit;
  previewGraphic?: Graphic;
  layers: RealLayer[];
}
