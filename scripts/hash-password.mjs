// Gera o hash da senha do painel: npm run hash-password -- "minha senha"
import bcrypt from "bcryptjs";

const pwd = process.argv[2];
if (!pwd || pwd.length < 8) {
  console.error('Uso: npm run hash-password -- "senha-com-8-ou-mais-caracteres"');
  process.exit(1);
}
const hash = await bcrypt.hash(pwd, 12);
// em base64 para o "$" do hash não ser interpretado pelo .env
console.log(`ADMIN_PASSWORD_HASH=${Buffer.from(hash).toString("base64")}`);
