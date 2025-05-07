// main.jsx or index.jsx
import { ComponentType, lazy, useEffect, useState } from "react";

function Home() {
  return <h2>Home Page2</h2>;
}

function About() {
  return <h2>About Page</h2>;
}

function NotFoundPage() {
  return <h2>404 Not Found</h2>;
}

type DefaultReturn = { default: ComponentType };

function getAbout() {
  return new Promise<DefaultReturn>((resolve) => {
    setTimeout(() => {
      resolve({ default: About });
    }, 100);
  });
}

const routes: Record<string, ComponentType> = {
  "/": Home,
  "/about": lazy(getAbout),
};

function Blank() {
  return <div></div>;
}

export function useRouter() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || "/");
  const [componentType, setComponentType] = useState<ComponentType>(() => Blank);
  const [count, setCount] = useState(0);

  useEffect(() => {
    function checkRoute() {
      const newRoute = window.location.hash.slice(1) || "/";

      const component = routes[newRoute] ?? NotFoundPage;

      setRoute(newRoute);
      setComponentType(() => component);

      setCount((old) => old + 1);
    }

    checkRoute();

    const onHashChange = () => checkRoute();

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return { route, setRoute, Component: componentType, count };
}
