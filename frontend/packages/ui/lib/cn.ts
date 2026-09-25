import clsx, { type ClassValue } from "clsx";

/** Class-name joiner (clsx). Apps import it from here. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
