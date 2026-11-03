import { extractExcerpt } from "./excerpt";
import {
  CARD_DESCRIPTION_MAX,
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  MAX_EXCERPT_LENGTH,
} from "@/constants";

export { cn } from "cn";
export { extractExcerpt, stripMarkdown } from "./excerpt";
export {
  MAX_ROOTCOG_TITLE_LENGTH,
  CARD_TITLE_MAX,
  CARD_DESCRIPTION_MAX,
  MAX_EXCERPT_LENGTH,
};

export function formatTimestamp(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return "Unknown date";
  
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const year = date.getFullYear();
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  
  const day = date.getDate();
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${year} ${month} ${day}, ${hours}:${minutes}`;
}

export function extractDescription(md: string): string {
  return extractExcerpt(md, CARD_DESCRIPTION_MAX);
}

export function getCanonicalCogmitUrl(origin: string, authorId: string, cogmitId: string): string {
  return `${origin}/cogmits/${authorId}/${cogmitId}`;
}
