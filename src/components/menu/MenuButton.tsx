import React, { PropsWithChildren, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu } from "./Menu";
import "./menu.css";
import { useMenuApi } from "./MenuContext";

interface MenuButtonProps extends PropsWithChildren {
  style?: React.CSSProperties;
  title?: string;
}
export function MenuButton({ style, children, title }: MenuButtonProps) {
  const { hoverNext, hoverPrev, clickHovered, setHoverIndex } = useMenuApi();
  const [isPressed, setIsPressed] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const menuId = useId();
  const menuPortal = !isPressed ? null : createPortal(<Menu ref={menuRef} id={menuId} />, document.body);

  useEffect(
    function resetHoverIndexOnClose() {
      // Note that this is an effect since it modifies the parent context. We can't do it doing
      // setHoverIndex wrapper function since that can be called during render and cause an error. That means
      // this causes an extra render on close just to clear this index :(
      if (!isPressed) setHoverIndex(-1);
    },
    [isPressed, setHoverIndex]
  );

  function handleClickButton(e: React.MouseEvent<HTMLButtonElement>) {
    if (!buttonRef.current) return;
    if (!buttonRef.current.contains(e.target as Node)) return;

    setIsPressed((prevPressed) => !prevPressed);
  }

  useLayoutEffect(() => {
    if (!menuRef.current || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    menuRef.current.style.top = `${rect.bottom + 1}px`;
    menuRef.current.style.left = `${rect.right - menu.width}px`;

    if (isPressed) menuRef.current.focus();
  }, [isPressed, menuRef]);

  function closeOnBlur(e: React.FocusEvent<HTMLButtonElement>) {
    const isActiveElementInMenu =
      menuRef.current?.contains(e.relatedTarget) || buttonRef.current?.contains(e.relatedTarget);

    if (!isActiveElementInMenu) {
      setIsPressed(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!isPressed) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsPressed(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hoverNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hoverPrev();
    } else if (e.key === "Enter") {
      e.preventDefault();
      clickHovered();
    }
  }

  return (
    <>
      <button
        style={style}
        onClick={handleClickButton}
        ref={buttonRef}
        className="round-btn"
        aria-pressed={isPressed}
        onBlur={closeOnBlur}
        aria-haspopup="menu"
        aria-controls={isPressed ? menuId : undefined}
        title={title}
        aria-label={title}
        onKeyDown={handleKeyDown}
      >
        {children}
        {menuPortal}
      </button>
    </>
  );
}
