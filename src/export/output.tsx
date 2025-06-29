import Check from "@images/check.svg?react";
import { CssInfos, CssProp } from "@timeline/CssInfo";
import { Layers, Unit } from "@timeline/Layers";
import { Point } from "@timeline/point";
import { round2dp, unreachable } from "@util";
import { ColorName, Colors } from "@util/Colors";

export type Format = "js" | "css";

/**
 * Details about a CSS property that can be used on its own, but usually needs to be combined with a
 * pair prop in a shorthand form.
 */
interface PairPropInfo {
  /** The shorthand property name that combines the two properties, like `translate` or `scale`. */
  shorthandProp: string;

  /** The x property name, like `translateX` or `scaleX`. */
  xProp: CssProp;

  /** The y property name, like `translateY` or `scaleY`. */
  yProp: CssProp;

  color: ColorName;

  /**
   * The default value for the property. This is used when interpolating the value and the pair
   * value cannot be determined.
   */
  defaultValue: number;
}

const TranslatePair: PairPropInfo = {
  shorthandProp: "translate",
  xProp: "translateX",
  yProp: "translateY",
  defaultValue: 0,
  color: "blue",
} as const;

const ScalePair: PairPropInfo = {
  shorthandProp: "scale",
  xProp: "scaleX",
  yProp: "scaleY",
  defaultValue: 100,
  color: "orange",
} as const;

/**
 * A map of CSS properties that are paired together. This is used to check if a property is a pair
 * and needs special handling to combing it into a shorthand property. The "other" value will be
 * interpolated if it is not sampled at the same x value.
 */
const PairProps = {
  translateX: TranslatePair,
  translateY: TranslatePair,
  scaleX: ScalePair,
  scaleY: ScalePair,
} as const;

type PairProp = keyof typeof PairProps;

/**
 * An x, y sample point with extra info about the layer it came from. This is just a little more
 * convenient than tracking the layer directly even though it duplicates some data.
 */
interface SamplePlus extends Point {
  cssProp: CssProp;
  isFlipped: boolean;
  units: Unit;
}

/**
 * A time slice is a single point in time (x) and all the samples (from all CSS props/layer) at that
 * time. This allows us to merge multiple layers into a single keyframe entry.
 *
 * In cases where the samples on the layers are the the same x value, things are easy and we can
 * just output them directly, but not all CSS props will be sample at the same x values. For paired
 * props like translate-x and translate-y, this means we need to interpolate the missing values.
 * This is done by looking at the previous and next samples for each prop. When first constructed
 * the next and prev pointers are null. After all the samples are collected, we sort the time slices
 * and link them together to later to the interpolation.
 */
interface TimeSlice {
  x: number;
  prev: TimeSlice | null;
  next: TimeSlice | null;
  props: Map<CssProp, SamplePlus>;
}

/**
 * A format agnostic intermediate format for keyframe output. It's the offset and all the name-value
 * rule pairs for that time. The values might be paired values, like for translate-x and y as a
 * single translate value.
 */
interface KeyframeEntry {
  offset: number;
  rules: EntryRule[];
}

/** A single CSS property rule in a keyframe entry. */
interface EntryRule {
  /** The color to show this property in in the preview. */
  color: string;

  /**
   * The name of the property. This can be a combined pair property like "translate" if both
   * translate-x and y were used.
   */
  name: string;

  /**
   * This CSS value of the property at this offset. This was supposed to be format agnostic, but
   * JavaScript requires non-numeric values to be wrapped in quotes to be a string. That would have
   * been better to already handle here, but that's not how it is currently so the JavaScript outout
   * need to check if this value needs quotes or not. (Technically all JavaScript values can be
   * strings, but it's cleaner in the preview is we can avoid them sometimes.)
   */
  value: string;
}

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
 * Copies the generated keyframes to the clipboard. Changes what is copied based on the presence of
 * a rule name.
 *
 * @param layers Layers to generate CSS from.
 * @param ruleName Optional at-rule name. If missing, a bare keyframe list is returned.
 * @returns A message about the success that should be shown in a notification. This function
 *   doesn't do that for you since sometime we want to animate a dialog closed first.
 */
export async function copyToClipboard(layers: Layers, format: Format, ruleName: string) {
  const keyframeText = genKeyframeText(layers, format);
  await navigator.clipboard.writeText(generateCssAtRule(keyframeText, format, ruleName));

  const message =
    format === "js" ? "Copied JavaScript" : ruleName ? `Copied "${ruleName}" CSS` : "Copied CSS";
  return (
    <span className="flex items-center gap-2">
      <Check className="flex-none" /> <span className="truncate">{message}</span>
    </span>
  );
}

/**
 * Wraps a keyframe list in an at-rule if a name is given.
 *
 * @param keyframes Keyframe list.
 * @param ruleName Optional name of the keyframes at-rule. The user might leave this blank.
 * @returns Keyframe at-rule or the same keyframe list if no name was given.
 */
export function generateCssAtRule(
  keyframes: string | Layers,
  format: Format,
  ruleName?: string
): string {
  if (typeof keyframes !== "string") {
    keyframes = genKeyframeText(keyframes, format);
  }

  if (!ruleName || ruleName.trim().length === 0 || format === "js") {
    return keyframes;
  } else {
    return `@keyframes ${normalizeAtRuleName(ruleName)} {\n${indent(keyframes)}\n}`;
  }
}

/**
 * Generates CSS keyframe body text (the actual keyframe entries). Looks at all given layers and
 * produces entries for all samples. If multiple layers have samples at the same time, they are
 * merged into a single entry. Entries that are missing a CSS prop are interpolated by the browser
 * automatically.
 */
export function genKeyframeText(layers: Layers, format: Format, asHtml?: boolean): string {
  const entries = genKeyframeEntries(layers);

  switch (format) {
    case "css":
      return genCss(entries, asHtml);

    case "js":
      return genJavaScript(entries, asHtml);

    default:
      throw unreachable(format);
  }
}

function genCss(entries: KeyframeEntry[], asHtml?: boolean): string {
  // Collect all keyframe text in an array of lines we'll join later
  const parts: string[] = [];

  for (const entry of entries) {
    // Start keyframe at this percent
    parts.push(`${entry.offset}% {`);

    for (const r of entry.rules) {
      if (asHtml) {
        parts.push(`  <span style="color: ${r.color}">${r.name}: ${r.value};</span>`);
      } else {
        parts.push(`  ${r.name}: ${r.value};`);
      }
    }

    parts.push("}");
  }

  return parts.join("\n");
}

function asJsOffset(num: number) {
  switch (num) {
    case 0:
      return "0";

    case 100:
      return "1";

    default:
      return String(round2dp(num / 100));
  }
}

/**
 * Takes value string for the property and essentially adds quote marks around it if needed. If the
 * value represents a number then it can be used as-is as a JavaScript object literal values. If
 * not, we need to quote it and treat it like a string.
 *
 * Technically we could wrap all values in quotes, but I assume it's slightly faster to have the
 * output already be numbers when possible at the expense of doing it now. An mainly, it looks
 * cleaner to human eyes.
 *
 * @param value A value for the CSS property. It might be a number (as a string) or something with
 *   units or whitespace in it.
 * @returns A string that can be used as a JavaScript object literal value.
 */
export function asJsValue(value: string) {
  const isNumeric = !isNaN(value as unknown as number) && value.trim() !== "";
  return isNumeric ? value : `"${value}"`;
}

function genJavaScript(entries: KeyframeEntry[], asHtml?: boolean): string {
  // Collect all keyframe text in an array of lines we'll join later
  const chunks: string[] = [];

  for (const entry of entries) {
    const chunk: string[] = [`  {`];

    const lines: string[] = [];
    lines.push(`    offset: ${asJsOffset(entry.offset)}`);

    for (const r of entry.rules) {
      if (asHtml) {
        lines.push(`    <span style="color: ${r.color}">${r.name}: ${asJsValue(r.value)}</span>`);
      } else {
        lines.push(`    ${r.name}: ${asJsValue(r.value)}`);
      }
    }

    chunk.push(lines.join(",\n"));
    chunk.push("  }");
    chunks.push(chunk.join("\n"));
  }

  return "[\n" + chunks.join(",\n") + "\n]";
}

function genKeyframeEntries(layers: Layers): KeyframeEntry[] {
  const timeSlices = createTimeSlices(layers);

  const entries: KeyframeEntry[] = [];

  for (const x of timeSlices.keys()) {
    const timePercent = round2dp(x);
    const rules: EntryRule[] = [];

    const slice = timeSlices.get(x)!;

    const handledPairs = new Set<CssProp>();

    for (const cssProp of slice.props.keys()) {
      const sample = slice.props.get(cssProp)!;

      const pairInfo = PairProps[cssProp as PairProp] ?? null;

      if (pairInfo) {
        if (handledPairs.has(cssProp)) continue;
        const { shorthandProp, xProp, yProp } = pairInfo;
        handledPairs.add(xProp).add(yProp);
        const color = Colors[pairInfo.color];
        const { xValue, xUnits: xPx, yValue, yUnits: yPx } = getXyForPair(slice, xProp, yProp);
        rules.push({ name: shorthandProp, value: `${xValue}${xPx} ${yValue}${yPx}`, color });
      } else {
        const cssInfo = CssInfos[sample.cssProp];
        const fn = cssInfo.fn;
        const value = sample.isFlipped ? -sample.y : sample.y;
        rules.push({ name: sample.cssProp, value: fn(value), color: cssInfo.color });
      }
    }

    entries.push({
      offset: timePercent,
      rules,
    });
  }

  return entries;
}

/**
 * Generates a named keyframe animation declaration for the given property layers.
 *
 * @param name A valid CSS keyframe animation name. If it's invalid, the results might be invalid.
 * @param layers Layers to generate from.
 * @returns A full named `@keyframes` entry.
 */
export function getCssKeyframeAnimation(name: string, format: Format, layers: Layers) {
  return `@keyframes ${name} {\n` + genKeyframeText(layers, format) + "}";
}

function getXyForPair(slice: TimeSlice, xProp: CssProp, yProp: CssProp) {
  const xSample = slice.props.get(xProp) ?? interpolateValue(slice, xProp);
  const ySample = slice.props.get(yProp) ?? interpolateValue(slice, yProp);

  // return [xSample.isFlipped ? -xSample.y : xSample.y, ySample.isFlipped ? -ySample.y : ySample.y] as const;

  return {
    xValue: xSample.isFlipped ? -xSample.y : xSample.y,
    xUnits: xSample.units,
    yValue: ySample.isFlipped ? -ySample.y : ySample.y,
    yUnits: ySample.units,
  } as const;
}

/**
 * Merges all layers into time slices. A slice will exist for every sampled x point across all
 * layers, and those slices will have the CSS prop samples from all layers at that x point. Each
 * slice will produce a keyframe and that time.
 *
 * Not every CSS prop is in every slice since not every one is sampled at the same x value. For
 * standalone props like opacity, this is fine. For paired props like translateX and translateY, we
 * need to interpolate the missing values when outputting them. The slices are linked linked with
 * prev and next pointers to make that easier.
 *
 * @param layers The layers to create time slices from.
 * @returns A map of time slices keyed by their x value. The key are sorted in ascending order. The
 *   slices are linked with prev and next pointers.
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
        units: layer.units,
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
 * @returns A new map of time slices sorted by their x value. The slices are linked with prev and
 *   next pointers.
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
 * Finds the previous sample for a given CSS property the closest previous time slice that sampled
 * that prop.
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
 * Finds the next sample for a given CSS property the closest next time slice that sampled that
 * prop.
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
 * Interpolates the value of a CSS property at a given time slice. This is used for CSS properties
 * that are not sampled at the same x value, such as translateX and translateY. It finds the
 * previous and next samples for the given CSS property and calculates the interpolated value based
 * on the current time slices x relative the prev and next samples.
 *
 * If there is not a previous or next sample, it assumes the previous sample is 0 and the next
 * sample is 100. If both are missing they are assumed to be 0, but this is probably an error, since
 * why are we interpolating something with no samples?
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
      // FIXME: why don't we know these values from the layer?
      units: "%",
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
    units: (prev?.units ?? next?.units)!,
    x: slice.x,
    y: round2dp(y),
  };
}

const BadNameChars = /((^\d)|([^-_a-zA-Z0-9]))/g;
const LeadDoubleDash = /^--+/;

const IllegalNames = new Set(["none", "inherit", "initial", "unset"]);

/**
 * Normalizes a CSS animation name to ensure it's valid.
 *
 * @param proposed Any name inputted by the user. May be valid or not.
 * @returns A normalized, legal CSS animation name.
 */
export function normalizeAtRuleName(proposed: string) {
  const firstPass = proposed.replace(BadNameChars, "-");
  const secondsPass = firstPass.replace(LeadDoubleDash, "-");

  return IllegalNames.has(secondsPass) ? secondsPass + "-" : secondsPass;
}

/**
 * Normalizes a string to a known export format.
 *
 * @param format Any string, but should be an export format.
 * @returns The given export format or 'css' if not a match.
 */
export function normalizeFormat(format: string) {
  switch (format) {
    case "css":
    case "js":
      return format;

    default:
      return "css";
  }
}
