const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Amble/app/(partner)/profile.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Thêm state showAccountCenter
content = content.replace(
  'const canManageStaff = partner?.role === " owner\;',
 'const canManageStaff = partner?.role === \owner\;
 const [showAccountCenter, setShowAccountCenter] = useState(false);'
);

// 2. Thay thế phần team entry button
const oldSection = ' {canManageStaff && (\\n <TouchableOpacity\\n style={styles.teamEntryBtn}\\n onPress={() => router.push(\/partner-team\)}\\n >\\n <Ionicons name=\people-outline\ size={16} color=\#FF6B35\ />\\n <Text style={styles.teamEntryText}>Quáº£n lÃ½ nhÃ¢n sá»± nhÃ hÃ ng</Text>\\n <Ionicons name=\chevron-forward-outline\ size={16} color=\#9CA3AF\ />\\n </TouchableOpacity>\\n )}';

const newSection = ' {/* TRUNG TÂM TÀI KHOẢN */}\\n <TouchableOpacity\\n style={styles.accountCenterBtn}\\n onPress={() => setShowAccountCenter(!showAccountCenter)}\\n >\\n <View style={styles.accountCenterLeft}>\\n <Ionicons name=\shield-checkmark-outline\ size={18} color=\#FF6B35\ />\\n <Text style={styles.accountCenterText}>Trung tâm tài khoản</Text>\\n </View>\\n <Ionicons\\n name={showAccountCenter ? \chevron-up\ : \chevron-down\}\\n size={18}\\n color=\#9CA3AF\\\n />\\n </TouchableOpacity>\\n\\n {showAccountCenter && (\\n <TouchableOpacity\\n style={styles.accountCenterItem}\\n onPress={() => setShowProfileDetails(true)}\\n >\\n <Ionicons name=\document-text-outline\ size={16} color=\#374151\ />\\n <Text style={styles.accountCenterItemText}>Hồ sơ nhà hàng</Text>\\n <Ionicons name=\chevron-forward-outline\ size={16} color=\#9CA3AF\ />\\n </TouchableOpacity>\\n )}\\n\\n {showAccountCenter && (\\n <TouchableOpacity\\n style={styles.accountCenterItem}\\n onPress={() => setPwVisible(true)}\\n >\\n <Ionicons name=\key-outline\ size={16} color=\#374151\ />\\n <Text style={styles.accountCenterItemText}>Đổi mật khẩu</Text>\\n <Ionicons name=\chevron-forward-outline\ size={16} color=\#9CA3AF\ />\\n </TouchableOpacity>\\n )}\\n\\n {canManageStaff && (\\n <TouchableOpacity\\n style={styles.teamEntryBtn}\\n onPress={() => router.push(\/partner-team\)}\\n >\\n <Ionicons name=\people-outline\ size={16} color=\#FF6B35\ />\\n <Text style={styles.teamEntryText}>Quản lý nhân sự nhà hàng</Text>\\n <Ionicons name=\chevron-forward-outline\ size={16} color=\#9CA3AF\ />\\n </TouchableOpacity>\\n )}';

content = content.replace(oldSection, newSection);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Profile.tsx updated successfully');
