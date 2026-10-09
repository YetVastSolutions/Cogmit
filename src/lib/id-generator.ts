export function generateCogmitId(username: string, date: Date = new Date(), collisionSuffix?: number): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const year = date.getUTCFullYear();
  const month = months[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  const baseId = `${username}_${year}${month}${day}${hours}${minutes}`;
  
  if (collisionSuffix !== undefined && collisionSuffix > 1) {
    return `${baseId}_${collisionSuffix}`;
  }
  return baseId;
}
