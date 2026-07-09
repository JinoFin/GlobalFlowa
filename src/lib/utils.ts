export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatList(items: string[]) {
  return items.join(", ");
}
