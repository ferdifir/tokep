# Fitur Servis

Dokumen ini menjelaskan mekanisme katalog jasa pada tab Servis.

## Tujuan

Servis adalah katalog jasa berbasis rekomendasi komunitas. Listing bisa dibuat oleh pemilik jasa sendiri atau oleh pengguna lain yang ingin merekomendasikan seseorang. Fokusnya bukan hanya promosi, tetapi juga reputasi: rekomendasi, review, klaim kepemilikan, dan laporan peringatan.

## Entitas Database

Model utama:

- `ServiceListing`: data jasa yang tampil di katalog.
- `ServiceRecommendation`: rekomendasi/review dari user.
- `ServiceReport`: laporan masalah dari user.
- `ServiceClaim`: klaim kepemilikan listing.

Relasi user:

- `ownerId`: pemilik jasa yang sudah terverifikasi atau mengaku sebagai pemilik saat membuat listing.
- `submittedById`: user yang memasukkan listing ke katalog.
- `ServiceRecommendation.userId`: user yang memberi rekomendasi.
- `ServiceReport.userId`: user yang melaporkan masalah.
- `ServiceClaim.userId`: user yang mengajukan klaim.

## Alur Listing

Ada dua cara listing masuk:

1. Pemilik jasa membuat listing sendiri.
2. User lain merekomendasikan jasa seseorang.

Jika listing dibuat oleh pemilik, `ownerId` diisi. Jika listing dibuat sebagai rekomendasi untuk orang lain, `ownerId` kosong dan listing berstatus belum diklaim.

Form listing tidak meminta kategori secara manual. User cukup mengisi:

- Nama orang/usaha.
- Jenis jasa.
- Lokasi.
- Kontak publik opsional.
- Deskripsi singkat.

Sistem menentukan kategori dari jenis jasa dan deskripsi. Jika `GROQ_API_KEY` tersedia, klasifikasi dilakukan dengan Groq. Jika tidak tersedia atau gagal, sistem memakai fallback rule-based berbasis kata kunci.

Output klasifikasi:

- `category`: kategori utama seperti `Rumah`, `Kreatif`, `Kecantikan`, `Digital`, atau `Lainnya`.
- `tags`: tag jasa yang diekstrak dari jenis jasa/deskripsi/review.
- `qualityLabel`: label kualitas seperti `Direkomendasikan`, `Campuran`, atau `Perlu hati-hati`.
- `aiSummary`: ringkasan singkat untuk preview kartu.

## Tombol Kontak

Tombol `Kontak` hanya relevan untuk calon pengguna jasa, bukan pemilik listing.

Rule UI:

- Jika user adalah pemilik listing, tampilkan `Kelola`.
- Jika user bukan pemilik dan kontak tersedia, tampilkan `Kontak`.
- Jika kontak tidak tersedia atau listing belum diklaim, tampilkan `Klaim`.
- Tombol `Laporkan` tidak ditampilkan untuk pemilik listing.

## Rekomendasi

Rekomendasi digunakan untuk menaikkan trust dan memberi konteks kualitas jasa. Rekomendasi tidak memberi hak kepemilikan listing.

Data rekomendasi:

- Review singkat.
- Tag seperti `Tepat waktu`, `Harga jelas`, `Hasil rapi`, dan `Komunikasi baik`.

Efek rekomendasi:

- Menambah `recommendationCount`.
- Menambah `reviewCount`.
- Mengupdate `qualityLabel`, `aiSummary`, dan `tags`.
- Review terbaru dan ringkasan AI bisa ditampilkan sebagai preview di kartu.

Rating manual dihapus dari UX karena angka rating sering tidak sinkron dengan isi review. Sinyal kualitas lebih baik dihitung dari review, laporan, dan rekomendasi.

User bisa melihat review user lain melalui halaman detail listing di `/servis/[id]`.

## Laporan dan Peringatan

Laporan tidak menghapus listing. Laporan memberi sinyal risiko untuk pengguna lain.

Alasan laporan:

- Tidak datang.
- Harga tidak sesuai.
- Hasil tidak sesuai.
- Komunikasi buruk.
- Dugaan penipuan.
- Lainnya.

Saat laporan masuk:

- `ServiceReport` dibuat.
- `reportCount` bertambah.
- Jika jumlah laporan unik mencapai `SERVICE_REPORT_FLAG_THRESHOLD`, `ServiceListing.status` berubah menjadi `FLAGGED`.
- Kartu tetap tampil, tetapi diberi peringatan setelah threshold tercapai.

Status yang disarankan:

- `ACTIVE`: tampil normal.
- `FLAGGED`: tampil dengan peringatan.
- `RESTRICTED`: tampil terbatas atau turun ranking.
- `HIDDEN`: disembunyikan oleh admin untuk kasus berat.

## Klaim Listing

Klaim dipakai ketika pemilik jasa ingin mengambil alih listing yang dibuat oleh orang lain.

Metode klaim:

- OTP ke kontak yang tercantum di listing.
- Bukti profil publik seperti Instagram, Google Maps, website, atau katalog.
- Persetujuan rekomendator awal.

Status klaim:

- `PENDING`: klaim baru masuk.
- `APPROVED`: klaim disetujui.
- `REJECTED`: klaim ditolak.
- `DISPUTED`: ada klaim ganda atau listing sudah punya pemilik lain.

Rule penting:

- Banyak rekomendasi tidak otomatis membuat user boleh mengambil ownership.
- Jika listing sudah punya `ownerId` dan user lain mengklaim, klaim masuk sebagai `DISPUTED`, bukan overwrite.
- Admin hanya perlu masuk saat bukti tidak otomatis cukup atau ada sengketa.

## Peran Admin

Admin tidak perlu mengatur semua listing secara manual. Admin berperan untuk:

- Menyetujui/menolak klaim yang tidak bisa diverifikasi otomatis.
- Menangani klaim ganda.
- Menaikkan status listing ke `RESTRICTED` atau `HIDDEN`.
- Meninjau laporan berat seperti dugaan penipuan.

Semua event yang membutuhkan tindakan admin mengirim notifikasi Telegram ke
`ADMIN_TELEGRAM_ID` jika `TELEGRAM_BOT_TOKEN` tersedia:

- Listing jasa baru yang perlu review.
- Klaim listing baru atau klaim sengketa.
- Laporan yang mencapai threshold peringatan atau alasan dugaan penipuan.

Dasar keputusan admin:

- Apakah user menguasai kontak publik listing.
- Apakah link publik mencantumkan kontak/nama yang sama.
- Apakah rekomendator awal menyetujui klaim.
- Riwayat laporan dan perubahan data listing.
- Konsistensi nama, brand, lokasi, dan kontak.

## MVP Saat Ini

Implementasi saat ini sudah menyimpan data ke database:

- Listing jasa.
- Rekomendasi.
- Laporan.
- Klaim.
- Metadata AI/fallback: kategori, tag, label kualitas, dan ringkasan.
- Queue admin untuk klaim, laporan, dan listing yang perlu review.
- Aksi admin untuk approve/reject/dispute klaim.
- Aksi admin untuk memberi status `ACTIVE`, `FLAGGED`, `RESTRICTED`, atau `HIDDEN`.

Data dummy tidak dibuat otomatis saat request user. Seed/demo harus dijalankan secara eksplisit di development agar data produksi tidak tercampur contoh.

Guard abuse dasar:

- Satu user hanya punya satu rekomendasi per listing. Submit ulang akan memperbarui rekomendasi lama.
- Satu user hanya punya satu laporan per listing. Submit ulang akan memperbarui alasan/detail lama.
- Satu user hanya punya satu klaim per listing. Submit ulang akan memperbarui bukti klaim lama.
- Constraint unik juga disimpan di database untuk menahan request paralel.
- Rate limit berbasis Postgres menahan spam:
  - Tambah jasa: 10 request per user per jam.
  - Rekomendasi: 20 request per user per jam.
  - Laporan: 10 request per user per jam.
  - Klaim: 5 request per user per jam.
  - Save/unsave media: 120 request per user per menit.
  - Request OTP admin: 5 request per IP per 10 menit, ditambah cooldown OTP.

Environment:

- `GROQ_API_KEY`: API key Groq untuk analisis kategori/review.
- `GROQ_MODEL`: opsional, default `openai/gpt-oss-20b`.
- `SERVICE_REPORT_FLAG_THRESHOLD`: jumlah laporan unik sebelum listing diberi peringatan.
- `TELEGRAM_BOT_TOKEN` dan `ADMIN_TELEGRAM_ID`: notifikasi admin.
