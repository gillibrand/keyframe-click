/**
 * Util function to create a single CSS class name string from any number of string and objects. This is inspired by the
 * classnames NPM module, but extremely simplified for how it's used here.
 *
 * @param classNames Any number of class name string or objects. If they are strings they are used as-is, so can include
 *   multiple class names separated by spaces.
 *
 *   If they are objects, the keys should be the class names and the values should be booleans. If true, the class names
 *   are added to the result, otherwise they are skipped.
 * @returns A single class names string with all the given class names joined together.
 */
export function cx(...classNames: unknown[]) {
  const parts: string[] = [];

  for (let i = 0; i < classNames.length; i++) {
    const arg = classNames[i];

    if (arg === null) {
      continue;
    }

    const type = typeof arg;
    if (type === "string") {
      parts.push(arg as string);
    } else if (type === "object") {
      const object = arg as Record<string, boolean>;
      for (const className of Object.getOwnPropertyNames(object)) {
        if (object[className]) {
          parts.push(className);
        }
      }
    }
  }

  return parts.join(" ");
}
