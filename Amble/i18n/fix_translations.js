const fs = require('fs');
const path = require('path');

const filePath = 'e:/Amble/AmbleBooking1/Amble/i18n/translations.ts';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Define the translations for each language
const translations = {
  zh: {
    history: {
      statusOccupied: '使用中',
      statusNoShow: '未到',
    },
    admin: {
      statusOccupied: '使用中',
      statusNoShow: '未到',
      statusDeclined: '已拒绝',
    },
  },
  ko: {
    history: {
      statusOccupied: '사용 중',
      statusNoShow: '노쇼',
    },
    admin: {
      statusOccupied: '사용 중',
      statusNoShow: '노쇼',
      statusDeclined: '거절됨',
    },
  },
  ja: {
    history: {
      statusOccupied: '利用中',
      statusNoShow: '不参加',
    },
    admin: {
      statusOccupied: '利用中',
      statusNoShow: '不参加',
      statusDeclined: '辞退',
    },
  },
};

// Track current language section
let currentLang = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check for section headers
  const langMatch = line.match(/^\s+(vi|en|zh|ko|ja):\s*\{/);
  if (langMatch) {
    currentLang = langMatch[1];
    continue;
  }

  if (currentLang && translations[currentLang]) {
    const langTrans = translations[currentLang];

    // Check history statusOccupied
    const histOccMatch = line.match(/^\s+"history\.statusOccupied":\s*"(.*)",\s*$/);
    if (histOccMatch && langTrans.history.statusOccupied) {
      lines[i] = line.replace(histOccMatch[1], langTrans.history.statusOccupied);
      continue;
    }

    // Check history statusNoShow
    const histNoShowMatch = line.match(/^\s+"history\.statusNoShow":\s*"(.*)",\s*$/);
    if (histNoShowMatch && langTrans.history.statusNoShow) {
      lines[i] = line.replace(histNoShowMatch[1], langTrans.history.statusNoShow);
      continue;
    }

    // Check admin statusOccupied
    const adminOccMatch = line.match(/^\s+"admin\.bookings\.statusOccupied":\s*"(.*)",\s*$/);
    if (adminOccMatch && langTrans.admin.statusOccupied) {
      lines[i] = line.replace(adminOccMatch[1], langTrans.admin.statusOccupied);
      continue;
    }

    // Check admin statusNoShow
    const adminNoShowMatch = line.match(/^\s+"admin\.bookings\.statusNoShow":\s*"(.*)",\s*$/);
    if (adminNoShowMatch && langTrans.admin.statusNoShow) {
      lines[i] = line.replace(adminNoShowMatch[1], langTrans.admin.statusNoShow);
      continue;
    }

    // Check admin statusDeclined
    const adminDeclinedMatch = line.match(/^\s+"admin\.bookings\.statusDeclined":\s*"(.*)",\s*$/);
    if (adminDeclinedMatch && langTrans.admin.statusDeclined) {
      lines[i] = line.replace(adminDeclinedMatch[1], langTrans.admin.statusDeclined);
      continue;
    }
  }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done! Translations updated successfully.');
