const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function seedDummyContent() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch available users
  const { data: users, error: userError } = await supabase.from('profiles').select('id, full_name');
  if (userError || !users || users.length === 0) {
    console.error('No users found to author content.');
    process.exit(1);
  }

  // 2. Fetch categories
  const { data: categories } = await supabase.from('thread_categories').select('id');
  if (!categories || categories.length === 0) {
    console.error('No categories found.');
    process.exit(1);
  }

  const getRandomUser = () => users[Math.floor(Math.random() * users.length)].id;
  const getRandomCategory = () => categories[Math.floor(Math.random() * categories.length)].id;

  // 3. Insert Dummy Threads
  console.log('Seeding threads...');
  const threads = [
    { title: 'Bagaimana cara mengatasi rasa cemas berlebih saat ujian?', content: 'Akhir-akhir ini saya sering merasa panik saat menghadapi ujian. Adakah ayat alkitab atau saran untuk ini?', is_anonymous: true },
    { title: 'Mencari komunitas sel di sekitar kampus', content: 'Halo, saya mahasiswa baru dan sedang mencari grup komsel. Ada rekomendasi?', is_anonymous: false },
    { title: 'Tantangan dalam mempertahankan iman di lingkungan kerja', content: 'Di tempat kerja saya banyak sekali godaan dan praktik yang tidak sesuai dengan iman Kristen. Bagaimana teman-teman menghadapi hal ini?', is_anonymous: false }
  ];

  for (const t of threads) {
    await supabase.from('threads').insert({
      title: t.title,
      content: t.content,
      is_anonymous: t.is_anonymous,
      author_id: getRandomUser(),
      category_id: getRandomCategory(),
      view_count: Math.floor(Math.random() * 100),
      comment_count: Math.floor(Math.random() * 5)
    });
  }

  // 4. Insert Prayer Requests
  console.log('Seeding prayer requests...');
  const prayers = [
    { content: 'Mohon dukungan doa untuk kesembuhan ibu saya yang sedang dirawat di RS.', is_anonymous: false },
    { content: 'Tolong doakan skripsi saya agar bisa selesai bulan ini, dosen pembimbing sangat sulit dihubungi.', is_anonymous: true },
    { content: 'Doakan keuangan keluarga kami yang sedang mengalami kesulitan akibat PHK.', is_anonymous: true }
  ];

  for (const p of prayers) {
    await supabase.from('prayer_requests').insert({
      content: p.content,
      is_anonymous: p.is_anonymous,
      author_id: getRandomUser(),
      pray_count: Math.floor(Math.random() * 20)
    });
  }

  console.log('✅ Dummy content successfully injected!');
}

seedDummyContent();
