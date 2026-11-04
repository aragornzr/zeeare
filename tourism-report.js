/* Calendar periods follow Philippine time, independent of the browser timezone. */
(function(root) {
  const day = value => {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (value == null || Number.isNaN(date.valueOf())) return '';
    const parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const part = name => parts.find(p => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  function range(mode, selected) {
    const date = new Date(`${selected}T00:00:00Z`);
    if (Number.isNaN(date.valueOf())) throw Error('Select a date.');
    let start = new Date(date), end = new Date(date);
    if (mode === 'week') {start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); end = new Date(start);end.setUTCDate(end.getUTCDate() + 6);}
    if (mode === 'month') {start.setUTCDate(1);end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));}
    return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
  }
  const cents = row => Number.isSafeInteger(row.feeTotalCentavos) ? row.feeTotalCentavos : typeof row.fee === 'number' && Number.isFinite(row.fee) ? Math.round(row.fee * 100) : null;
  function totals(rows) {
    return rows.reduce((sum,row) => {
      sum.registrations++;
      if (Number.isInteger(row.touristCount) && row.touristCount > 0) sum.tourists += row.touristCount; else sum.unknownCounts++;
      const amount = cents(row);if (amount === null) sum.unknownFees++;else sum.centavos += amount;
      return sum;
    }, {registrations:0,tourists:0,centavos:0,unknownCounts:0,unknownFees:0});
  }
  function daily(rows) {
    const groups = new Map();
    for (const row of rows) {const date=day(row.createdAt);if (!groups.has(date)) groups.set(date,[]);groups.get(date).push(row);}
    return [...groups].sort(([a],[b])=>b.localeCompare(a)).map(([date,records])=>({date,...totals(records)}));
  }
  const api = {day,range,totals,daily};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;else root.TourismReport = api;
})(typeof window !== 'undefined' ? window : globalThis);
