const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "backup-deleted-spam-users-2026-08-13.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const users = data.candidates;

const hasVnMark = (s) => s && /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/.test(s);
const vnDomains = [".edu.vn", "fpt.edu.vn", "tdtu.edu.vn", "studeng.tdtu", "dothanhhien.com.vn", "gmail", "gmaik"];

const vnLikely = users.filter((u) => hasVnMark(u.fullName) || /\bviet|fpt|tdtu/i.test(u.email));
const foreign = users.filter((u) => !hasVnMark(u.fullName) && !/\bviet|fpt|tdtu/i.test(u.email));

console.log(`Tổng bị xóa: ${users.length}`);
console.log(`-- NGHI NGƯỜI VIỆT THẬT (${vnLikely.length}) --`);
vnLikely.forEach((u) => console.log(`  ${u.email} | ${u.fullName} | ${new Date(u.createdAt).toISOString().slice(0,10)}`));
console.log(`\n-- CÒN LẠI (dạng spam nước ngoài/khác) (${foreign.length}) --`);
foreign.forEach((u) => console.log(`  ${u.email} | ${u.fullName}`));