import { UserDot } from "./point";

/**
 * A single animatable property and it's complete state. A timeline is built of multiple property
 * layers to produce the final animation.
 */
export interface Layer {
  cssProp: string;
  sampleCount: number;
  isInvertValue: boolean;
  dots: UserDot[];
}
