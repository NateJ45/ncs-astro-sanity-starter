// PORTABLE: canonical copy - ncs-astro-sanity-starter is the library of record for this file
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
