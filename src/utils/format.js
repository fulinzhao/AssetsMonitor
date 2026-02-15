export function formatPrice(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  const absValue = Math.abs(value);
  let fractionDigits = 2;

  if (absValue < 1) {
    fractionDigits = 4;
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatSigned(value, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTime(timestamp) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const timeStr = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}
