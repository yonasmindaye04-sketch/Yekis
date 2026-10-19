/** Small class-name helper used by the local shadcn-style primitives. */
export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
