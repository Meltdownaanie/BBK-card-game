'use strict';
/* Display names for the house bots. Ordinary-looking handles (3-20 chars); the server swaps them regularly. */
const NAMES = [
  'minhkhoi', 'Thu_Trang', 'hoangnam92', 'Bao_Ngoc', 'duc.anh', 'KimLien99', 'tuanvu', 'NgocMai_', 'quangminh',
  'linh_nguyen', 'Hieu_Pro', 'trangmeo', 'anhkhoa', 'Phuong_Vy', 'khanhhoa', 'viet_hung', 'thaoNguyen', 'Long_2k',
  'dat_nguyen', 'MinhThu', 'huy_hoang', 'Lan_Anh', 'sonTung', 'bichphuong', 'trungkien', 'Yen_Nhi', 'phatdo',
  'hongnhung', 'quocbao', 'Thanh_Tam', 'nhatminh', 'cam_tu', 'dangkhoa', 'Mai_Linh', 'tienDat', 'khanhlinh',
  'giabao', 'ThuyAn', 'hai_dang', 'Kim_Ngan', 'tuananh', 'PhuongThao', 'manhcuong', 'ngoc_diep', 'baoanh',
  'Duy_Khang', 'thanhhuyen', 'vinhphuc', 'Hoai_An', 'minh_chau', 'kieuoanh', 'trongnghia', 'LeHuy', 'thuhien',
  'anhthu', 'kaito_92', 'mirafox', 'NightOwl', 'redhammer', 'paper_tiger', 'scissorlin', 'luna.k', 'jaydee',
  'alex_nguyen', 'sam_tran', 'chloe.m', 'kevin_l', 'ryan.pham', 'mia_vu', 'tommy.d', 'nina_ha', 'leo_do',
  'zoe_nguyen', 'finn.k', 'ivy_tran', 'max_le', 'ella.pham', 'noah_vo', 'lily.n', 'owen_h', 'tracy_vu',
  'Hoang_Long', 'Quynh_Anh', 'phuc_loc', 'thanhson', 'myduyen', 'tri_dung', 'ngan_ha', 'danh_vu', 'khoi.vo',
  'hanhnguyen', 'bin_bin', 'Su_Su', 'tomtom', 'miu_miu', 'kuncoi', 'boo_97', 'cubi', 'nhim_xu', 'chip_chip'
];
const ok = n => n.length >= 3 && n.length <= 20 && n === n.trim();

/* A name that none of the `exclude` names (compared case-insensitively) is using. */
function pick(exclude = []) {
  const used = new Set(exclude.map(x => String(x || '').toLowerCase()));
  const free = NAMES.filter(n => ok(n) && !used.has(n.toLowerCase()));
  const list = free.length ? free : NAMES;
  return list[Math.floor(Math.random() * list.length)];
}
module.exports = { NAMES, pick };
