const TZ = 'Asia/Bangkok';

/** วันที่ปัจจุบันตามเวลาไทย เป็น YYYY-MM-DD */
export function todayISO(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

export function addDays(iso: string, days: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + days));
	return dt.toISOString().slice(0, 10);
}

export function startOfMonth(iso: string): string {
	return iso.slice(0, 8) + '01';
}

export function endOfMonth(iso: string): string {
	const [y, m] = iso.split('-').map(Number);
	const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
	return `${iso.slice(0, 8)}${String(last).padStart(2, '0')}`;
}

/** 2026-10-30 -> 30/10/2026 */
export function fmtDate(iso: string | null | undefined): string {
	if (!iso) return '-';
	const [y, m, d] = iso.split('-');
	return `${d}/${m}/${y}`;
}

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS = [
	'ม.ค.',
	'ก.พ.',
	'มี.ค.',
	'เม.ย.',
	'พ.ค.',
	'มิ.ย.',
	'ก.ค.',
	'ส.ค.',
	'ก.ย.',
	'ต.ค.',
	'พ.ย.',
	'ธ.ค.'
];

/** 2026-10-30 -> ศ. 30 ต.ค. 2569 */
export function fmtDateThai(iso: string | null | undefined): string {
	if (!iso) return '-';
	const [y, m, d] = iso.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return `${THAI_DAYS[dt.getUTCDay()]} ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

export function fmtDateTime(ts: Date | number | null | undefined): string {
	if (!ts) return '-';
	const d = typeof ts === 'number' ? new Date(ts) : ts;
	return new Intl.DateTimeFormat('th-TH', {
		timeZone: TZ,
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}

export function fmtBaht(n: number | null | undefined): string {
	if (n === null || n === undefined) return '-';
	return n.toLocaleString('th-TH') + ' ฿';
}

export function fmtShift(start: string | null, end: string | null): string {
	if (!start && !end) return '-';
	return `${start ?? '?'}-${end ?? '?'}`;
}

/** แยกชื่อ "นางสาวต้นหอม ไทยใหญ่ (ต้นหอม)" -> { fullName, nickname } */
export function parseThaiName(raw: string): { fullName: string; nickname: string | null } {
	let s = raw.replace(/\s+/g, ' ').trim();
	let nickname: string | null = null;
	const m = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
	if (m) {
		s = m[1].trim();
		nickname = m[2].trim() || null;
	}
	// ตัดคำนำหน้า รวมถึงที่พิมพ์ตกหล่น เช่น "าสาว", "สาว", "นา'งสาว"
	s = s.replace(/^(นา'?งสาว|าสาว|สาว|นาย|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/, '').trim();
	return { fullName: s, nickname };
}
