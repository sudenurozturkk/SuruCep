// Hesap sistemi (demo): kullanıcılar tarayıcıda, şifre SHA-256 özetiyle saklanır.
// Supabase Auth bağlanınca bu modülün arayüzü aynı kalır, içi değişir.
import { initDb, uuid } from '../data/db';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  village: string;
  pass: string;
  createdAt: string;
}

const USERS = 'surucep.users';
const SESSION = 'surucep.session';

export const DEMO_EMAIL = 'demo@surucep.app';
export const DEMO_PASS = 'demo1234';

function users(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS) ?? '[]');
  } catch {
    return [];
  }
}
function saveUsers(list: User[]) {
  localStorage.setItem(USERS, JSON.stringify(list));
}

async function hash(email: string, pw: string): Promise<string> {
  const data = new TextEncoder().encode(`surucep:${email.toLowerCase()}:${pw}`);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // HTTPS dışı eski tarayıcılar için basit yedek
  let h = 0;
  for (const b of data) h = (h * 31 + b) | 0;
  return 'x' + (h >>> 0).toString(16);
}

export function currentUser(): User | null {
  const id = localStorage.getItem(SESSION);
  return (id && users().find((u) => u.id === id)) || null;
}

export function logout() {
  localStorage.removeItem(SESSION);
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  village: string;
  password: string;
  demo: boolean;
}

export async function signup(inp: SignupInput): Promise<User> {
  const email = inp.email.trim().toLowerCase();
  if (users().some((u) => u.email === email)) throw new Error('Bu e-posta ile zaten bir hesap var. Giriş yapın.');
  const user: User = {
    id: uuid(),
    name: inp.name.trim(),
    email,
    phone: inp.phone.trim(),
    village: inp.village.trim(),
    pass: await hash(email, inp.password),
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users(), user]);
  initDb(user.id, { owner: { name: user.name, phone: user.phone, village: user.village }, demo: inp.demo });
  localStorage.setItem(SESSION, user.id);
  return user;
}

export async function login(emailRaw: string, password: string): Promise<User> {
  const email = emailRaw.trim().toLowerCase();
  const u = users().find((x) => x.email === email);
  if (!u || u.pass !== (await hash(email, password))) throw new Error('E-posta veya şifre hatalı.');
  localStorage.setItem(SESSION, u.id);
  return u;
}

/** Jüri için tek tıkla demo hesabı (Ahmet Yılmaz'ın 8 ineklik çiftliği) */
export async function loginDemo(): Promise<User> {
  if (!users().some((u) => u.email === DEMO_EMAIL)) {
    return signup({ name: 'Ahmet Yılmaz', email: DEMO_EMAIL, phone: '05320000000', village: 'Yeşilyurt Köyü', password: DEMO_PASS, demo: true });
  }
  return login(DEMO_EMAIL, DEMO_PASS);
}
