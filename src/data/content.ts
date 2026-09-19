export type Category = 'all' | 'registration' | 'directions' | 'assistance';
export type PhraseIcon = 'register' | 'calendar' | 'file' | 'card' | 'pin' | 'pharmacy' | 'lab' | 'hand' | 'repeat' | 'heart' | 'queue' | 'text';
export interface Phrase { id: string; title: string; text: string; category: Exclude<Category, 'all'>; icon: PhraseIcon; }

export const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'registration', label: 'Pendaftaran' },
  { id: 'directions', label: 'Lokasi' },
  { id: 'assistance', label: 'Bantuan' },
];

// Copy from the PRD. These are manually selected phrases, not recognition results.
export const phrases: Phrase[] = [
  { id: 'INT-01', title: 'Mendaftar', text: 'Saya ingin mendaftar.', category: 'registration', icon: 'register' },
  { id: 'INT-02', title: 'Sudah ada janji', text: 'Saya sudah memiliki janji.', category: 'registration', icon: 'calendar' },
  { id: 'INT-05', title: 'Loket pendaftaran', text: 'Di mana loket pendaftaran?', category: 'directions', icon: 'pin' },
  { id: 'INT-04', title: 'Menggunakan BPJS', text: 'Saya menggunakan BPJS.', category: 'registration', icon: 'card' },
  { id: 'INT-06', title: 'Mencari apotek', text: 'Di mana apotek?', category: 'directions', icon: 'pharmacy' },
  { id: 'INT-08', title: 'Penerjemah BISINDO', text: 'Saya membutuhkan penerjemah BISINDO.', category: 'assistance', icon: 'hand' },
  { id: 'INT-03', title: 'Membawa rujukan', text: 'Saya membawa surat rujukan.', category: 'registration', icon: 'file' },
  { id: 'INT-07', title: 'Laboratorium', text: 'Di mana laboratorium?', category: 'directions', icon: 'lab' },
  { id: 'INT-09', title: 'Tolong ulangi', text: 'Saya belum mengerti. Tolong ulangi atau tuliskan.', category: 'assistance', icon: 'repeat' },
  { id: 'Q-01', title: 'Nomor antrean', text: 'Berapa nomor antrean saya?', category: 'registration', icon: 'queue' },
  { id: 'Q-02', title: 'Tolong tuliskan', text: 'Tolong tuliskan jawabannya.', category: 'assistance', icon: 'text' },
  { id: 'INT-10', title: 'Terima kasih', text: 'Terima kasih.', category: 'assistance', icon: 'heart' },
];

export const staffResponses = [
  { label: 'Arah pendaftaran', text: 'Silakan menuju loket pendaftaran di sebelah kanan meja informasi. (Lokasi contoh)' },
  { label: 'Dokumen pendaftaran', text: 'Mohon siapkan kartu identitas, kartu BPJS, atau surat rujukan untuk petugas pendaftaran.' },
  { label: 'Ruang tunggu', text: 'Silakan duduk di ruang tunggu di depan loket. Petugas dapat membantu memeriksa antrean Anda. (Lokasi contoh)' },
  { label: 'Ulangi penjelasan', text: 'Baik, saya akan menuliskan kembali penjelasannya. Bagian mana yang ingin Anda tanyakan?' },
];
