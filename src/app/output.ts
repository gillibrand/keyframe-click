import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Layers } from "@timeline/Layers";
import { Point } from "@timeline/point";
import { getOrInit, round2dp } from "@util";

interface SamplePoint extends Point {
  cssProp: CssProp;
  isFlipped: boolean;
}

/**
 * Generates CSS keyframe body text (the actual keyframe entries). Looks at all give layers and produces entries for all
 * sample. If multiple layers have samples at the same time, they are merged into a single entry. Entries that are
 * missing a CSS prop are interpolated by the browser automatically.
 */
export function genCssKeyframeText(layers: Layers): string {
  const sampleLayers = layers.getAllUserSamples();

  // Samples from different CSS props can be at the same offset (X), so gather all of them first
  // since they need to be in the same keyframe
  const sampleMap = new Map<number, SamplePoint[]>();

  for (let i = 0; i < sampleLayers.length; i++) {
    const layer = sampleLayers[i];

    for (let j = 0; j < layer.userSamples.length; j++) {
      const sample = layer.userSamples[j];
      const x = sample.x;
      const samples = getOrInit(sampleMap, x, []);

      samples.push({
        cssProp: layer.cssProp,
        isFlipped: layer.isFlipped,
        x,
        y: sample.y,
      });
    }
  }

  // Keys of the maps might not be in order after merging layers, so sort them for the right order.
  const sortedXs = Array.from(sampleMap.keys()).sort((a, b) => a - b);

  // Collect all keyframe text in array of lines we'll join later
  const parts: string[] = [];

  for (let i = 0; i < sortedXs.length; i++) {
    const x = sortedXs[i];

    // Start keyframe at this percent
    const timePercent = round2dp(x);
    parts.push(`${timePercent}% {`);

    const samples = sampleMap.get(x)!;

    for (let j = 0; j < samples.length; j++) {
      const sample = samples[j];
      const fn = CssInfos[sample.cssProp].fn;
      const value = sample.isFlipped ? -sample.y : sample.y;
      parts.push(`  ${fn(value)}`);
    }

    parts.push("}");
  }

  return parts.join("\n");
}
