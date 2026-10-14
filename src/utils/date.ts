// Current date/time in the store's time zone (Brasília). The old name getLisbonDate is kept so existing imports keep working.
export function getBrazilDate() {
  try {
    const now = new Date();
    const brazilString = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const parsed = new Date(brazilString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {}
  return new Date();
}

export const getLisbonDate = getBrazilDate;
