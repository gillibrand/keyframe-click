import { describe, expect, test } from "vitest";
import { normalizeAtRuleName } from "./output";

describe("normalizeAtRuleName", () => {
  test("unchanged names", () => {
    expect(normalizeAtRuleName("anim")).toBe("anim");
    expect(normalizeAtRuleName("my-anim")).toBe("my-anim");
  });

  test("whitespace", () => {
    expect(normalizeAtRuleName("my anim")).toBe("my-anim");
    expect(normalizeAtRuleName(" my-anim ")).toBe("-my-anim-");
  });

  test("leading double dashes", () => {
    expect(normalizeAtRuleName("--my-anim")).toBe("-my-anim");
    expect(normalizeAtRuleName("---my-anim")).toBe("-my-anim");
    expect(normalizeAtRuleName("------my-anim")).toBe("-my-anim");
  });

  test("leading leading numbers", () => {
    expect(normalizeAtRuleName("10-my-anim")).toBe("-0-my-anim");
    expect(normalizeAtRuleName("1-my-anim")).toBe("-my-anim");
    expect(normalizeAtRuleName("1--my-anim")).toBe("-my-anim");
  });

  test("wacky stuff", () => {
    expect(normalizeAtRuleName("this-&#*!)(-thing")).toBe("this--------thing");
    expect(normalizeAtRuleName("&*(this-&#*!)(-thing&*(")).toBe("-this--------thing---");
  });

  test("with forbidden keyword", () => {
    // unset, initial, and inherit), as well as none.
    expect(normalizeAtRuleName("unset")).toBe("unset-");
    expect(normalizeAtRuleName("initial")).toBe("initial-");
    expect(normalizeAtRuleName("inherit")).toBe("inherit-");
    expect(normalizeAtRuleName("none")).toBe("none-");
  });
});
