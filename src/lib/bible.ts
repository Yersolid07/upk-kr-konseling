// src/lib/bible.ts

const VERSES = [
  { text: "Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.", ref: "Filipi 4:6" },
  { text: "Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.", ref: "Yeremia 29:11" },
  { text: "Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu.", ref: "1 Petrus 5:7" },
  { text: "Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.", ref: "Filipi 4:13" },
  { text: "TUHAN adalah gembalaku, takkan kekurangan aku.", ref: "Mazmur 23:1" },
  { text: "Kasih itu sabar; kasih itu murah hati; ia tidak cemburu. Ia tidak memegahkan diri dan tidak sombong.", ref: "1 Korintus 13:4" },
  { text: "Pencobaan-pencobaan yang kamu alami ialah pencobaan-pencobaan biasa, yang tidak melebihi kekuatan manusia.", ref: "1 Korintus 10:13" },
  { text: "Damai sejahtera Allah, yang melampaui segala akal, akan memelihara hati dan pikiranmu dalam Kristus Yesus.", ref: "Filipi 4:7" },
  { text: "Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya.", ref: "Yesaya 40:31" },
  { text: "Janganlah takut, sebab Aku menyertai engkau, janganlah bimbang, sebab Aku ini Allahmu; Aku akan meneguhkan, bahkan akan menolong engkau.", ref: "Yesaya 41:10" },
  { text: "Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.", ref: "Matius 11:28" },
  { text: "Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri.", ref: "Amsal 3:5" },
  { text: "Sebab Allah memberikan kepada kita bukan roh ketakutan, melainkan roh yang membangkitkan kekuatan, kasih dan ketertiban.", ref: "2 Timotius 1:7" },
  { text: "Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.", ref: "Yohanes 3:16" },
  { text: "Pencuri datang hanya untuk mencuri dan membunuh dan membinasakan; Aku datang, supaya mereka mempunyai hidup, dan mempunyainya dalam segala kelimpahan.", ref: "Yohanes 10:10" },
  { text: "Akulah jalan dan kebenaran dan hidup. Tidak ada seorangpun yang datang kepada Bapa, kalau tidak melalui Aku.", ref: "Yohanes 14:6" },
  { text: "Tetapi carilah dahulu Kerajaan Allah dan kebenarannya, maka semuanya itu akan ditambahkan kepadamu.", ref: "Matius 6:33" },
  { text: "Sebab karena kasih karunia kamu diselamatkan oleh iman; itu bukan hasil usahamu, tetapi pemberian Allah.", ref: "Efesus 2:8" },
  { text: "Jika kita mengaku dosa kita, maka Ia adalah setia dan adil, sehingga Ia akan mengampuni segala dosa kita dan menyucikan kita dari segala kejahatan.", ref: "1 Yohanes 1:9" },
  { text: "Berjaga-jagalah! Berdirilah teguh dalam iman! Bersikaplah sebagai laki-laki! Dan tetap kuat!", ref: "1 Korintus 16:13" }
]

export function getDailyVerse() {
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return VERSES[dayOfYear % VERSES.length]
}
