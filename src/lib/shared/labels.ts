// ป้ายชื่อภาษาไทยที่ใช้ร่วมกันทั้ง server และ client

export const COVERAGE_LABELS: Record<string, string> = {
	spare: 'ส่งคนแทน',
	rotate: 'หมุนคนในไซต์',
	none_needed: 'หน่วยงานไม่เอาคนแทน',
	unable: 'ส่งคนแทนไม่ได้',
	pending: 'ยังไม่ระบุคนแทน'
};

export const STATUS_LABELS: Record<string, string> = {
	todo: 'To do',
	doing: 'Doing',
	done: 'Done'
};

export const STATUS_LABELS_TH: Record<string, string> = {
	todo: 'รอดำเนินการ',
	doing: 'กำลังทำ',
	done: 'เสร็จแล้ว'
};

export const PAY_LABELS: Record<string, string> = {
	pending: 'รอเบิก',
	claimed: 'เบิกแล้ว',
	no_pay: 'ไม่จ่าย'
};

export const ROLE_LABELS: Record<string, string> = {
	admin: 'ธุรการ (Admin)',
	manager: 'หัวหน้า',
	employee: 'พนักงาน'
};

export const STAFF_TYPES = ['EX', 'WL', 'HO', 'HS'] as const;

export const REASONS = [
	'ลาป่วย',
	'ลาป่วย-ฉุกเฉิน',
	'ลากิจ',
	'ลากิจ-ฉุกเฉิน',
	'พักร้อน',
	'Dayoff',
	'ลาออก',
	'รายวัน',
	'เรียนงาน',
	'เปลี่ยนตัว',
	'โยกย้ายตำแหน่ง',
	'เปิดไซต์',
	'ลาบวช',
	'ขาดงาน',
	'อื่นๆ'
] as const;

export const COMMON_SHIFTS = [
	'08:00-17:00',
	'08:30-17:30',
	'09:00-18:00',
	'09:30-18:30',
	'10:00-19:00',
	'11:00-20:00',
	'12:00-21:00',
	'13:00-22:00',
	'13:30-22:30'
];
