export const toneOptions = ["Formal", "Friendly", "Professional", "Enthusiastic"];

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function starRow(rating) {
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < Math.round(rating);
    return `<span class="star ${filled ? "is-filled" : ""}">&#9733;</span>`;
  }).join("");
}

export function badgeClass(status) {
  if (status === "pending") return "warning";
  if (status === "edited") return "neutral";
  return "success";
}

export function badgeLabel(status) {
  if (status === "pending") return "Pendente";
  if (status === "edited") return "Editada manualmente";
  return "Respondida";
}

export function truncate(text, maxLength = 120) {
  const value = String(text || "");
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}...`;
}

export function drawLineChart(series = []) {
  if (!series.length) {
    return "";
  }

  const width = 640;
  const height = 250;
  const padding = 30;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = series.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { ...point, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" aria-hidden="true">
      <defs>
        <linearGradient id="chartAreaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(34, 95, 255, 0.26)"></stop>
          <stop offset="100%" stop-color="rgba(34, 95, 255, 0.02)"></stop>
        </linearGradient>
      </defs>
      ${[0, 1, 2, 3].map((row) => {
        const y = padding + ((height - padding * 2) / 3) * row;
        return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="chart-grid"></line>`;
      }).join("")}
      <path d="${areaPath}" fill="url(#chartAreaFill)"></path>
      <path d="${linePath}" class="chart-line"></path>
      ${points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.5" class="chart-point"></circle>
            <text x="${point.x}" y="${height - 6}" text-anchor="middle" class="chart-label">${escapeHtml(point.label)}</text>
          `,
        )
        .join("")}
    </svg>
  `;
}

export function parseHashRoute(hashValue) {
  const clean = hashValue.replace(/^#/, "") || "dashboard";
  const [route, query = ""] = clean.split("?");
  const params = new URLSearchParams(query);
  return { route: route || "dashboard", params };
}

