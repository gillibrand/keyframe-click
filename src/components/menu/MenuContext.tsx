import { createContext, Dispatch, SetStateAction, useCallback, useContext, useMemo, useState } from "react";
import { MenuItem } from "./MenuItem";

/**
 * The API for the current menu. This is used to manage the hover index and click the currently
 * hovered item. This lets the menu itself and any components that create the menu control it (e.g.,
 * having a combo box edit what's selected).
 */
interface MenuApi {
  /**
   * The index of the currently hovered item from the mouse or arrow keys. -1 if no item is hovered.
   */
  hoverIndex: number;

  /**
   * Sets the index of the currently hovered item. This will do bounds checking so that the index is
   * always between -1 and items.length - 1. -1 if no item is hovered.
   */
  setHoverIndex: Dispatch<SetStateAction<number>>;

  /**
   * Moves the hover index to the next item. This will loop around to the first item if the last
   * item is hovered.
   */
  hoverNext: () => void;

  /**
   * Moves the hover index to the previous item. This will loop around to the last item if the first
   * item is hovered.
   */
  hoverPrev: () => void;

  /**
   * Clicks the currently hovered item and executes its onClick function. The items needs to support
   * onClick and be enabled.
   */
  clickHovered: () => void;

  /**
   * The items in the menu.
   */
  items: MenuItem[];
}

const MenuContext = createContext<MenuApi | undefined>(undefined);

/**
 * A hook to get the current menu details. The menu itself uses this, but component that create and
 * control the menu can too.
 *
 * @returns The current menu API.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMenuApi() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenuApi must be used within a MenuProvider");
  }
  return context;
}

/**
 * A provider for the menu API. This tracks the current menu items and their hover state. It creates
 * the API to change state.
 *
 * @param children The children of the provider.
 * @param items The items in the menu.
 */
export function MenuProvider({ children, items }: { children: React.ReactNode; items: MenuItem[] }) {
  const [hoverIndex, setHoverIndexRaw] = useState(-1);

  const hoverNext = useCallback(() => {
    setHoverIndexRaw((prev) => {
      for (let nextIndex = prev + 1; nextIndex < items.length; nextIndex++) {
        if (items[nextIndex].type === "toggle") {
          return nextIndex;
        }
      }
      // Loop around to the beginning
      for (let nextIndex = 0; nextIndex < prev; nextIndex++) {
        if (items[nextIndex].type === "toggle") {
          return nextIndex;
        }
      }

      return prev;
    });
  }, [items]);

  const hoverPrev = useCallback(() => {
    setHoverIndexRaw((prev) => {
      for (let nextIndex = prev - 1; nextIndex >= 0; nextIndex--) {
        if (items[nextIndex].type === "toggle") {
          return nextIndex;
        }
      }
      // Loop around to the end
      for (let nextIndex = items.length - 1; nextIndex > prev; nextIndex--) {
        if (items[nextIndex].type === "toggle") {
          return nextIndex;
        }
      }

      return prev;
    });
  }, [items]);

  const clickHovered = useCallback(() => {
    const item = items[hoverIndex];
    if (item && item.type === "toggle") {
      item.onClick();
    }
  }, [items, hoverIndex]);

  const setHoverIndex = useCallback(
    (index: SetStateAction<number>) => {
      setHoverIndexRaw((prevIndex) => {
        const newIndex = typeof index === "function" ? index(prevIndex) : index;
        return Math.max(-1, Math.min(newIndex, items.length - 1));
      });
    },
    [items]
  );

  const value: MenuApi = useMemo(
    () => ({ hoverIndex, setHoverIndex, hoverNext, hoverPrev, items, clickHovered }),
    [hoverIndex, hoverNext, hoverPrev, items, clickHovered, setHoverIndex]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}
