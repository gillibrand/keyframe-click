import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Layers } from "@timeline/Layers";
import { Point } from "@timeline/point";
import { round2dp } from "@util";

/**
 * Details about a CSS property that can be used on its own, but usually needs to be combined with a pair prop in a
 * shorthand form.
 */
interface PairPropInfo {
  /** The shorthand property name that combines the two properties, like `translate` or `scale`. */
  shorthandProp: string;

  /** The x property name, like `translateX` or `scaleX`. */
  xProp: CssProp;

  /** The y property name, like `translateY` or `scaleY`. */
  yProp: CssProp;

  /**
   * The default value for the property. This is used when interpolating the value and the pair value cannot be
   * determined.
   */
  defaultValue: number;
}

const TranslateInfo: PairPropInfo = {
  shorthandProp: "translate",
  xProp: "translateX",
  yProp: "translateY",
  defaultValue: 0,
} as const;

const ScaleInfo: PairPropInfo = {
  shorthandProp: "scale",
  xProp: "scaleX",
  yProp: "scaleY",
  defaultValue: 100,
} as const;

/**
 * A map of CSS properties that are paired together. This is used to check if a property is a pair and needs special
 * handling to combing it into a shorthand property. The "other" value will be interpolated if it is not sampled at the
 * same x value.
 */
const PairProps = {
  translateX: TranslateInfo,
  translateY: TranslateInfo,
  scaleX: ScaleInfo,
  scaleY: ScaleInfo,
} as const;

type PairProp = keyof typeof PairProps;

/**
 * An x, y sample point with extra info about the layer it came from. This is just a little more convenient than
 * tracking the layer directly even though it duplicates some data.
 */
interface SamplePlus extends Point {
  cssProp: CssProp;
  isFlipped: boolean;
}

/**
 * A time slice is a single point in time (x) and all the samples (from all CSS props/layer) at that time. This allows
 * us to merge multiple layers into a single keyframe entry.
 *
 * In cases where the samples on the layers are the the same x value, things are easy and we can just output them
 * directly, but not all CSS props will be sample at the same x values. For paired props like translate-x and
 * translate-y, this means we need to interpolate the missing values. This is done by looking at the previous and next
 * samples for each prop. When first constructed the next and prev pointers are null. After all the samples are
 * collected, we sort the time slices and link them together to later to the interpolation.
 */
interface TimeSlice {
  x: number;
  prev: TimeSlice | null;
  next: TimeSlice | null;
  props: Map<CssProp, SamplePlus>;
}

/**
 * Generates CSS keyframe body text (the actual keyframe entries). Looks at all given layers and produces entries for
 * all samples. If multiple layers have samples at the same time, they are merged into a single entry. Entries that are
 * missing a CSS prop are interpolated by the browser automatically.
 */
export function genCssKeyframeText(layers: Layers): string {
  const timeSlices = createTimeSlices(layers);

  // Collect all keyframe text in an array of lines we'll join later
  const parts: string[] = [];

  for (const x of timeSlices.keys()) {
    // Start keyframe at this percent
    const timePercent = round2dp(x);
    parts.push(`${timePercent}% {`);

    const slice = timeSlices.get(x)!;

    const handledPairs = new Set<CssProp>();

    for (const cssProp of slice.props.keys()) {
      const sample = slice.props.get(cssProp)!;

      const pairInfo = PairProps[cssProp as PairProp] ?? null;
      if (pairInfo) {
        if (handledPairs.has(cssProp)) continue;
        const { shorthandProp, xProp, yProp } = pairInfo;
        handledPairs.add(xProp).add(yProp);

        const [xValue, yValue] = getXyForPair(slice, xProp, yProp);
        parts.push(`  ${shorthandProp}: ${xValue}% ${yValue}%;`);
      } else {
        const fn = CssInfos[sample.cssProp].fn;
        const value = sample.isFlipped ? -sample.y : sample.y;
        parts.push(`  ${fn(value)}`);
      }
    }

    parts.push("}");
  }

  return parts.join("\n");
}

function getXyForPair(slice: TimeSlice, xProp: CssProp, yProp: CssProp) {
  const xSample = slice.props.get(xProp) ?? interpolateValue(slice, xProp);
  const ySample = slice.props.get(yProp) ?? interpolateValue(slice, yProp);

  return [xSample.isFlipped ? -xSample.y : xSample.y, ySample.isFlipped ? -ySample.y : ySample.y] as const;
}

/**
 * Merges all layers into time slices. A slice will exist for every sampled x point across all layers, and those slices
 * will have the CSS prop samples from all layers at that x point. Each slice will produce a keyframe and that time.
 *
 * Not every CSS prop is in every slice since not every one is sampled at the same x value. For standalone props like
 * opacity, this is fine. For paired props like translateX and translateY, we need to interpolate the missing values
 * when outputting them. The slices are linked linked with prev and next pointers to make that easier.
 *
 * @param layers The layers to create time slices from.
 * @returns A map of time slices keyed by their x value. The key are sorted in ascending order. The slices are linked
 *   with prev and next pointers.
 */
function createTimeSlices(layers: Layers) {
  const sampleLayers = layers.getAllUserSamples();
  const timeSlices = new Map<number, TimeSlice>();

  for (let i = 0; i < sampleLayers.length; i++) {
    const layer = sampleLayers[i];

    for (let j = 0; j < layer.userSamples.length; j++) {
      const sample = layer.userSamples[j];
      // need to round these now so the slight difference on the layers will merge into the same slice.
      const x = round2dp(sample.x);

      let slice = timeSlices.get(x);

      if (!slice) {
        slice = {
          x,
          prev: null,
          next: null,
          props: new Map<CssProp, SamplePlus>(),
        };
        timeSlices.set(x, slice);
      }

      const samplePlus: SamplePlus = {
        cssProp: layer.cssProp,
        isFlipped: layer.isFlipped,
        x: x,
        y: round2dp(sample.y),
      };

      slice.props.set(layer.cssProp, samplePlus);
    }
  }

  // Keys of the maps might not be in order after merging layers, so sort them for the right order.
  return sortAndLinkTimeSlices(timeSlices);
}

/**
 * Sorts the time slices by their x value and links them together with prev and next pointers.
 *
 * @param timeSlices The time slices to sort and link.
 * @returns A new map of time slices sorted by their x value. The slices are linked with prev and next pointers.
 */
function sortAndLinkTimeSlices(timeSlices: Map<number, TimeSlice>): Map<number, TimeSlice> {
  const sortedXs = Array.from(timeSlices.keys()).sort((a, b) => a - b);
  const sortedTimeSlices = new Map<number, TimeSlice>();

  // Track the previous sample for each CSS property
  let prevSlice: TimeSlice | null = null;

  for (let i = 0; i < sortedXs.length; i++) {
    const x = sortedXs[i];
    const slice = timeSlices.get(x)!;

    slice.prev = prevSlice;
    if (prevSlice) {
      prevSlice.next = slice;
    }

    sortedTimeSlices.set(x, slice);
    prevSlice = slice;
  }

  return sortedTimeSlices;
}

/**
 * Finds the previous sample for a given CSS property the closest previous time slice that sampled that prop.
 *
 * @param slice Slice to start searching from.
 * @param cssProp CSS property to find the previous sample for.
 * @returns The previous sample for the given CSS property, or null if not found.
 */
function prevSample(slice: TimeSlice, cssProp: CssProp): SamplePlus | null {
  let current = slice.prev;
  while (current) {
    const sample = current.props.get(cssProp);
    if (sample) return sample;
    current = current.prev;
  }

  return null;
}

/**
 * Finds the next sample for a given CSS property the closest next time slice that sampled that prop.
 *
 * @param slice Slice to start searching from.
 * @param cssProp CSS property to find the next sample for.
 * @returns The next sample for the given CSS property, or null if not found.
 */
function nextSample(slice: TimeSlice, cssProp: CssProp): SamplePlus | null {
  let current = slice.next;
  while (current) {
    const sample = current.props.get(cssProp);
    if (sample) return sample;
    current = current.next;
  }

  return null;
}

/**
 * Interpolates the value of a CSS property at a given time slice. This is used for CSS properties that are not sampled
 * at the same x value, such as translateX and translateY. It finds the previous and next samples for the given CSS
 * property and calculates the interpolated value based on the current time slices x relative the prev and next
 * samples.
 *
 * If there is not a previous or next sample, it assumes the previous sample is 0 and the next sample is 100. If both
 * are missing they are assumed to be 0, but this is probably an error, since why are we interpolating something with no
 * samples?
 *
 * @param slice The time slice to interpolate the value for.
 * @param cssProp The CSS property to interpolate the value for.
 * @returns The interpolated value for the given CSS property at the time slice.
 */
function interpolateValue(slice: TimeSlice, cssProp: CssProp): SamplePlus {
  const prev = prevSample(slice, cssProp);
  const next = nextSample(slice, cssProp);

  if (!prev && !next) {
    // This is the case if ONLY a propX or propY is set.
    const defaultValue = PairProps[cssProp as PairProp]?.defaultValue ?? 0;
    return {
      cssProp,
      isFlipped: false,
      x: slice.x,
      y: defaultValue,
    };
  }

  const x1 = prev?.x ?? 0;
  const y1 = prev?.y ?? 0;

  const x2 = next?.x ?? 100;
  const y2 = (next?.y ?? prev?.y)!;

  const length = x2 - x1;
  const xLength = slice.x - x1;
  const percent = xLength / length;

  const y = (y2 - y1) * percent + y1;

  return {
    cssProp,
    isFlipped: (prev?.isFlipped ?? next?.isFlipped)!,
    x: slice.x,
    y: round2dp(y),
  };
}
