import { describe, expect, test } from "vitest";
import { asJsValue, normalizeAtRuleName } from "./output";

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

describe("asJsValue", () => {
  test("numbers", () => {
    expect(asJsValue("0")).toBe("0");
    expect(asJsValue("123")).toBe("123");
    expect(asJsValue("-1")).toBe("-1");
  });

  test("whitespace", () => {
    expect(asJsValue("0 1")).toBe('"0 1"');
    expect(asJsValue(" 1")).toBe(" 1");
    expect(asJsValue("123 456")).toBe('"123 456"');
    expect(asJsValue("")).toBe('""');
    expect(asJsValue(" ")).toBe('" "');
  });

  test("units", () => {
    expect(asJsValue("1turn")).toBe('"1turn"');
    expect(asJsValue("12.3px")).toBe('"12.3px"');
    expect(asJsValue("12.3px")).toBe('"12.3px"');
  });
});
