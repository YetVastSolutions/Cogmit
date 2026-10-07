export { cn } from "cn";

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
