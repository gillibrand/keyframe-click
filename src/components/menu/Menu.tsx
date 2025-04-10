import { forwardRef, memo, Ref } from "react";
import { useMenuApi } from "./MenuContext";
import { LabelMenuItem, MenuItem, ToggleMenuItem } from "./MenuItem";

interface MenuProps {
  id: string;
  hoverIndex?: number;
}

export const Menu = memo(
  forwardRef(function Menu({ id }: MenuProps, ref: Ref<HTMLUListElement>) {
    const { items, hoverIndex, setHoverIndex } = useMenuApi();

    function renderItem(item: MenuItem, index: number) {
      switch (item.type) {
        case "label":
          return <LabelMenuItem key={index} label={item.label} />;

        case "toggle":
          return (
            <ToggleMenuItem
              key={index}
              isHover={index === hoverIndex}
              isChecked={item.isChecked}
              label={item.label}
              onClick={item.onClick}
              onEnter={() => setHoverIndex(index)}
              onLeave={() => setHoverIndex((prev) => (prev === index ? -1 : prev))}
            />
          );
      }
    }

    return (
      <ul className="Menu" tabIndex={0} autoFocus={true} ref={ref} id={id} role="menu">
        {items.map((item, index) => renderItem(item, index))}
      </ul>
    );
  })
);
