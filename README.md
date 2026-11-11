# Image Lab

Aplikasi untuk membuat gambar dari prompt atau mengubah gambar menggunakan Cloudflare Workers AI.

## Menjalankan secara lokal

1. Install dependensi:

   ```bash
   npm install
   ```

2. Buat file `.env.local` di root proyek dan isi kredensial Cloudflare:

   ```env
   CLOUDFLARE_ACCOUNT_ID=account_id_kamu
   CLOUDFLARE_API_TOKEN=api_token_kamu
   ```

   Simpan token di server. Jangan commit file kredensial.

3. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

4. Buka [localhost:3000](http://localhost:3000).

## Cara penggunaan

- **Text to image:** tulis deskripsi gambar, lalu klik **Generate image**.
- **Image to image:** unggah JPG, PNG, atau WebP hingga 3 MiB, tulis perubahan yang diinginkan, lalu klik **Generate image**.
- Klik **Download image** untuk menyimpan hasil. Hasil tidak disimpan oleh aplikasi.
- Gunakan tombol bulan/matahari di header untuk mengganti tema.

Setiap generasi memakai alokasi Cloudflare Workers AI dan dapat dikenakan biaya. **Generate again** memulai permintaan baru.

Pada mode production, generasi hanya aktif jika environment variable `ALLOW_PAID_GENERATION=true`.
