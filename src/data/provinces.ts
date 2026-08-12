export type ProvinceId = 'Punjab' | 'Sindh' | 'KP' | 'Balochistan' | 'Islamabad';

export interface ProvinceMeta {
  id: ProvinceId;
  name: string;
  generalSeats: number; // NA general seats
  paSeats: number; // provincial assembly general seats
  paWomenSeats: number;
  paMinoritySeats: number;
  districts: string[];
  urbanDistricts: string[]; // treated with urban dynamics (esp. Karachi)
  color: string;
}

export const PROVINCES: Record<ProvinceId, ProvinceMeta> = {
  KP: {
    id: 'KP', name: 'Khyber Pakhtunkhwa', generalSeats: 45,
    paSeats: 115, paWomenSeats: 26, paMinoritySeats: 4,
    districts: ['Peshawar', 'Mardan', 'Swat', 'Swabi', 'Nowshera', 'Charsadda', 'Kohat', 'Bannu', 'Dera Ismail Khan', 'Malakand', 'Buner', 'Shangla', 'Chitral', 'Abbottabad', 'Haripur', 'Mansehra', 'Karak', 'Lakki Marwat', 'Tank', 'North Waziristan', 'South Waziristan', 'Bajaur', 'Khyber', 'Kurram'],
    urbanDistricts: ['Peshawar'],
    color: '#8B4513',
  },
  Islamabad: {
    id: 'Islamabad', name: 'Islamabad Capital Territory', generalSeats: 3,
    paSeats: 0, paWomenSeats: 0, paMinoritySeats: 0,
    districts: ['Islamabad'],
    urbanDistricts: ['Islamabad'],
    color: '#2E2E2E',
  },
  Punjab: {
    id: 'Punjab', name: 'Punjab', generalSeats: 141,
    paSeats: 297, paWomenSeats: 66, paMinoritySeats: 8,
    districts: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Sargodha', 'Bahawalpur', 'Sahiwal', 'Sheikhupura', 'Rahim Yar Khan', 'Gujrat', 'Jhang', 'Dera Ghazi Khan', 'Kasur', 'Okara', 'Vehari', 'Muzaffargarh', 'Toba Tek Singh', 'Chiniot', 'Hafizabad', 'Mandi Bahauddin', 'Narowal', 'Jhelum', 'Attock', 'Chakwal', 'Khushab', 'Mianwali', 'Bhakkar', 'Layyah', 'Rajanpur', 'Pakpattan', 'Nankana Sahib', 'Khanewal', 'Lodhran', 'Bahawalnagar'],
    urbanDistricts: ['Lahore', 'Rawalpindi', 'Faisalabad'],
    color: '#00693E',
  },
  Sindh: {
    id: 'Sindh', name: 'Sindh', generalSeats: 61,
    paSeats: 130, paWomenSeats: 29, paMinoritySeats: 9,
    districts: ['Karachi Central', 'Karachi East', 'Karachi South', 'Karachi West', 'Karachi Korangi', 'Karachi Malir', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpurkhas', 'Jacobabad', 'Shikarpur', 'Khairpur', 'Dadu', 'Thatta', 'Badin', 'Tando Allahyar', 'Tando Muhammad Khan', 'Ghotki', 'Kashmore', 'Naushahro Feroze', 'Sanghar', 'Umerkot', 'Tharparkar', 'Jamshoro', 'Matiari'],
    urbanDistricts: ['Karachi Central', 'Karachi East', 'Karachi South', 'Karachi West', 'Karachi Korangi', 'Karachi Malir', 'Hyderabad'],
    color: '#E4181C',
  },
  Balochistan: {
    id: 'Balochistan', name: 'Balochistan', generalSeats: 16,
    paSeats: 51, paWomenSeats: 11, paMinoritySeats: 3,
    districts: ['Quetta', 'Pishin', 'Killa Abdullah', 'Zhob', 'Loralai', 'Sibi', 'Nasirabad', 'Jaffarabad', 'Kalat', 'Khuzdar', 'Lasbela', 'Gwadar', 'Turbat / Kech', 'Panjgur', 'Chagai', 'Dera Bugti', 'Kohlu', 'Mastung', 'Ziarat', 'Barkhan'],
    urbanDistricts: ['Quetta'],
    color: '#8B5E3C',
  },
};

export const PROVINCE_LIST = Object.values(PROVINCES);
export const TOTAL_GENERAL_SEATS = PROVINCE_LIST.reduce((s, p) => s + p.generalSeats, 0); // 266
export const WOMEN_RESERVED_SEATS = 60;
export const MINORITY_RESERVED_SEATS = 10;
export const TOTAL_NA_SEATS = TOTAL_GENERAL_SEATS + WOMEN_RESERVED_SEATS + MINORITY_RESERVED_SEATS; // 336
export const NA_MAJORITY = Math.floor(TOTAL_NA_SEATS / 2) + 1; // 169
