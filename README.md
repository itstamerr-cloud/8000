# ٨٠٠٠ — إدارة استهداف الحسابات وتوزيعها على فريق المبيعات

تطبيق إنتاجي لإدارة استهداف ~8000 حساب وتوزيعها يومياً (٥ لكل موظف) على ١٤ موظف ميداني،
مع تتبّع المحاولات وإعادة توزيع المجموعات.

- **الواجهة:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · shadcn/ui-style · عربية RTL · خط Tajawal
- **الخلفية:** Supabase (Postgres + Auth) — مشروع `8000`
- **النشر:** Vercel · الكود على GitHub

---

## القواعد الجوهرية

1. **مصدر واحد:** كل الحسابات في `accounts` مرتّبة بـ`seq` (ترتيب الملف الأصلي).
2. **التوزيع اليومي:** زر واحد ⟶ يأخذ التالي ٧٠ حساباً `new` بالترتيب ⟶ ١٤ مجموعة × ٥ ⟶ يعلّمها `distributed`. اليوم التالي يُكمل بلا تكرار.
3. **سقف صارم (مفروض على مستوى القاعدة):** موظف واحد = مجموعة واحدة (٥ حسابات) في اليوم — عبر `unique(employee_id, day)`.
4. **حالات المحاولة:** `pending` · `no_answer` · `interested` · `not_interested` · `callback`.
5. **سجل المحاولات:** كل استهداف = صف في `attempts` (الحساب قد يملك عدة محاولات عبر الزمن — تظهر كـtimeline).
6. **إعادة التوزيع بالمجموعة كاملة:** الخمسة تتحرك ككتلة لموظف واحد. ممنوع تكرار الموظف لنفس المجموعة (`unique(group_id, employee_id)`) أو إعطاؤه مجموعتين في اليوم نفسه.
7. **رابط الموظف بدون كلمة مرور:** `/[token]` — استعلام على السيرفر بـ`service_role`، مفلتر حسب موظف الـtoken فقط؛ المفتاح السري لا يصل المتصفح.
8. **الأدمن:** تسجيل دخول عبر Supabase Auth (إيميل + كلمة مرور).

---

## الصفحات

| المسار | الوصف | الحماية |
|---|---|---|
| `/login` | تسجيل دخول الأدمن | عام |
| `/` | لوحة التحكم: مؤشرات + تقدّم الموظفين + زر «وزّع خمسات اليوم» + تنقّل بين الأيام | محمي |
| `/accounts` | بحث/استعراض الحسابات + Drawer لمسار المجموعة وسجل المحاولات | محمي |
| `/redistribute` | بطاقات المجموعات + تحويل المجموعة لموظف/يوم | محمي |
| `/[token]` | صفحة الموظف: حتى ٥ حسابات لأحدث يوم، تحديث الحالة + الملاحظة | عام عبر token |

---

## الإعداد المحلي

```bash
npm install
cp .env.example .env.local   # ثم املأ SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

### متغيّرات البيئة

| المتغيّر | الاستخدام |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | عام — العميل والسيرفر |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | عام — لوحة الأدمن عبر Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | **سيرفر فقط** — صفحة الموظف وServer Actions (لا يُستورد في كود العميل) |
| `NEXT_PUBLIC_APP_URL` | الرابط الأساسي — يستخدمه سكربت التهيئة لطباعة روابط الموظفين |

> احصل على `SUPABASE_SERVICE_ROLE_KEY` من: Supabase → Project `8000` → Settings → API → `service_role`.

---

## قاعدة البيانات

السكيمة والدوال وRLS مطبّقة بالفعل على مشروع Supabase `8000`. الملف الكامل (للنسخ/إعادة الإنشاء):
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)

- جداول: `accounts`, `employees`, `groups`, `group_accounts`, `assignments`, `attempts`
- دوال: `distribute_day(p_day)` · `redistribute_group(p_group, p_employee, p_day)` (كلتاهما `security definer` بـ`search_path` مثبّت وتنفيذ ممنوع على `anon`)
- RLS مُفعّل على كل الجداول؛ `anon` بلا سياسات

---

## سكربت التهيئة (مرّة واحدة)

> البيانات الحالية مُحمّلة بالفعل (8280 حساب + 14 موظف). هذا السكربت لإعادة الإنشاء في بيئة نظيفة.

```bash
npm run seed -- ./accounts_source.xlsx
```

يقرأ الملف، يدخل الحسابات بـ`seq` بترتيب الصفوف، يدخل الموظفين الـ١٤ مع token فريد، ثم يطبع جدول
«اسم الموظف + رابطه الكامل» لإرساله على واتساب.

---

## النشر على Vercel

1. ادفع المستودع إلى GitHub (repo خاص).
2. على Vercel: **New Project** → اختر هذا الـrepo → Framework: **Next.js** (يُكتشف تلقائياً).
3. **Environment Variables** — أضف الأربعة:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← ضعه **Production/Preview** فقط (Secret، سيرفر فقط)
   - `NEXT_PUBLIC_APP_URL` ← دومين Vercel النهائي (مثلاً `https://your-app.vercel.app`)
4. **Deploy**.
5. بعد أول نشر، حدّث `NEXT_PUBLIC_APP_URL` بالدومين الفعلي إن لزم، وأعد النشر — لتظهر روابط الموظفين صحيحة.

> أمان: `SUPABASE_SERVICE_ROLE_KEY` ليس له بادئة `NEXT_PUBLIC_`، لذا لا يدخل حزمة المتصفح إطلاقاً، ويُستخدم فقط في `lib/supabase/admin.ts` المحمي بـ`server-only`.

---

## الدخول كأدمن

- البريد: `tamer@t9agency.com`
- كلمة المرور المؤقتة: `Admin8000!change-me` — **غيّرها** من Supabase → Authentication بعد أول دخول.
