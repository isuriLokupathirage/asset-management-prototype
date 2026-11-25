export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${formatDate(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatMoney = (n?: number) =>
n === undefined || n === null || Number.isNaN(n) ? '' : `LKR ${n.toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export const toDateInput = (iso?: string) => iso ? iso.slice(0, 10) : '';

export const daysFromNow = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | undefined>>) {
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
