import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";
import { AuthModel } from "../src/models/authModel.js";
import { ensureSchema } from "../src/utils/ensureSchema.js";

const USAGE = "用法：node scripts/seedAdmin.js <帳號> <姓名> <密碼>";

const [username, name, password] = process.argv.slice(2);

// block arg errors before touching db
if (!username || !name || !password) {
  console.error(USAGE);
  process.exit(1);
}
if (password.length < 8) {
  console.error("密碼長度至少 8 個字元");
  process.exit(1);
}

const seedAdmin = async () => {
  try {
    await ensureSchema();

    const existing = await AuthModel.countAdmins();
    if (existing > 0) {
      console.error(`已存在 ${existing} 個管理員帳號，請改用管理員後台「建立帳號」功能。`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await AuthModel.createAccount(username, passwordHash, null, "admin");
    await AuthModel.createAdmin(name, username);

    // 密碼是操作者自己在指令列指定的，不需要再強制變更一次
    const account = await AuthModel.findAccountByUsername(username);
    await AuthModel.setMustChangePassword(account.id, false);

    console.log(`管理員帳號建立完成：${username}（${name}）`);
  } catch (error) {
    console.error("建立管理員帳號失敗：", error?.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedAdmin();
