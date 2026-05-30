const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSeed() {
  console.log('🌱 Starting Seed Process...');

  // 1. Seed Thread Categories
  const categories = [
    { name: 'Iman & Rohani', name_en: 'Faith & Spirituality', slug: 'iman', icon: '🙏', color: '#C9993A', sort_order: 1 },
    { name: 'Kecemasan', name_en: 'Anxiety', slug: 'kecemasan', icon: '🌊', color: '#C4895A', sort_order: 2 },
    { name: 'Keluarga', name_en: 'Family', slug: 'keluarga', icon: '👨‍👩‍👧‍👦', color: '#6B8C72', sort_order: 3 },
    { name: 'Akademik', name_en: 'Academic', slug: 'akademik', icon: '📚', color: '#7C5C3E', sort_order: 4 },
    { name: 'Karir', name_en: 'Career', slug: 'karir', icon: '💼', color: '#8A6090', sort_order: 5 },
    { name: 'Hubungan', name_en: 'Relationships', slug: 'hubungan', icon: '🤝', color: '#A07850', sort_order: 6 },
    { name: 'Motivasi', name_en: 'Motivation', slug: 'motivasi', icon: '🔥', color: '#4A8C7C', sort_order: 7 },
    { name: 'Umum', name_en: 'General', slug: 'umum', icon: '💬', color: '#888888', sort_order: 8 }
  ];

  console.log('Injecting Thread Categories...');
  for (const cat of categories) {
    const { error } = await supabase.from('thread_categories').upsert(cat, { onConflict: 'slug' });
    if (error) console.error('Error inserting category:', cat.name, error.message);
  }

  // 2. Seed Daily Verses
  const verses = [
    { display_date: new Date().toISOString().split('T')[0], verse_ref: 'Filipi 4:6', verse_text: 'Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.' },
    { display_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], verse_ref: 'Matius 11:28', verse_text: 'Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.' }
  ];
  
  console.log('Injecting Daily Verses...');
  for (const verse of verses) {
    const { error } = await supabase.from('daily_verses').upsert(verse, { onConflict: 'display_date' });
    if (error) console.error('Error inserting verse:', verse.display_date, error.message);
  }

  // Find a user to act as author
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const authorId = users && users.length > 0 ? users[0].id : null;

  if (authorId) {
    // 3. Seed Articles / Renungan
    const articles = [
      { 
        title: 'Menemukan Kedamaian di Tengah Badai', 
        slug: 'menemukan-kedamaian-di-tengah-badai', 
        excerpt: 'Bagaimana kita bisa tetap tenang ketika situasi di sekitar kita penuh dengan ketidakpastian?', 
        content: 'Dalam kehidupan perkuliahan, seringkali kita dihadapkan pada tenggat waktu yang mencekik, ekspektasi keluarga yang tinggi, dan kecemasan akan masa depan. Namun, Firman Tuhan mengingatkan kita bahwa damai sejahtera yang melampaui segala akal akan memelihara hati dan pikiran kita (Filipi 4:7).\n\nLangkah pertama untuk menemukan kedamaian adalah dengan melepaskan kendali dan menyerahkannya kepada Tuhan...',
        cover_url: 'https://images.unsplash.com/photo-1518558997970-4fdc4ec3e6fd?q=80&w=2070&auto=format&fit=crop',
        is_published: true,
        read_count: 42,
        tags: ['Kecemasan', 'Pengharapan'],
        author_id: authorId
      },
      { 
        title: 'Membangun Identitas di Dalam Kristus', 
        slug: 'membangun-identitas-kristus', 
        excerpt: 'Dunia menawarkan banyak label, tetapi hanya satu identitas yang abadi dan tidak bisa digoyahkan.', 
        content: 'Media sosial seringkali mendikte nilai diri kita berdasarkan jumlah suka, pengikut, atau pencapaian akademis. Ketika kita gagal, kita merasa tidak berharga. Tetapi Alkitab mengatakan bahwa kita adalah "karya buatan Allah, diciptakan dalam Kristus Yesus untuk melakukan pekerjaan baik" (Efesus 2:10).\n\nIdentitas kita bukan didasarkan pada apa yang kita lakukan, melainkan pada siapa kita di mata Tuhan...',
        cover_url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=2070&auto=format&fit=crop',
        is_published: true,
        read_count: 128,
        tags: ['Identitas', 'Pemuda'],
        author_id: authorId
      }
    ];

    console.log('Injecting Articles...');
    for (const article of articles) {
      const { error } = await supabase.from('articles').upsert(article, { onConflict: 'slug' });
      if (error) console.error('Error inserting article:', article.title, error.message);
    }
  }

  // 4. Find Counselor to seed availability
  console.log('Checking for Counselors...');
  const { data: counselors } = await supabase.from('profiles').select('id, full_name').eq('role', 'konselor').limit(1);
  
  if (counselors && counselors.length > 0) {
    console.log(`Found counselor: ${counselors[0].full_name}. Injecting availability...`);
    const counselorId = counselors[0].id;
    
    // Create availability for next 3 days
    for (let i = 1; i <= 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const availabilities = [
        { konselor_id: counselorId, date: dateString, start_time: '15:00:00', end_time: '16:00:00', is_booked: false },
        { konselor_id: counselorId, date: dateString, start_time: '19:00:00', end_time: '20:00:00', is_booked: false }
      ];
      
      for (const slot of availabilities) {
        // Just try inserting, ignoring if duplicate (assuming no unique constraint is hit or we just let it fail silently)
        const { error } = await supabase.from('konselor_availability').insert(slot).select();
        // Ignore duplicate errors
      }
    }
  } else {
    console.log('No counselor found. Skipping availability injection. (You can change a user role to "konselor" in Supabase to test this).');
  }

  console.log('✅ Seed Process Completed Successfully!');
}

runSeed();
