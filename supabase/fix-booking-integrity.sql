-- =====================================================
-- BOOKING INTEGRITY & AVAILABILITY
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
-- =====================================================

-- 1. Anti double-booking: satu konselor tidak boleh punya dua booking aktif
--    pada waktu yang sama. Booking yang dibatalkan tidak menghalangi slot.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking_per_slot
  ON public.bookings (konselor_id, scheduled_at)
  WHERE status <> 'cancelled';

-- 2. RPC: kembalikan slot waktu yang SUDAH terisi untuk seorang konselor pada
--    tanggal tertentu. Hanya mengembalikan waktu (tanpa data pribadi pemesan),
--    sehingga anggota bisa melihat slot kosong tanpa melanggar privasi RLS.
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_konselor_id UUID, p_date DATE)
RETURNS TABLE(scheduled_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.scheduled_at
  FROM public.bookings b
  WHERE b.konselor_id = p_konselor_id
    AND b.scheduled_at::date = p_date
    AND b.status <> 'cancelled';
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(UUID, DATE) TO authenticated;

-- 3. Trigger: saat booking dibuat, kirim notifikasi ke konselor.
--    SECURITY DEFINER agar boleh menulis baris notifikasi milik user lain,
--    melewati RLS secara terkendali (bukan dari client).
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (
    NEW.konselor_id,
    'booking_confirmed',
    'Permintaan Sesi Baru',
    'Seorang anggota mengajukan jadwal konseling. Silakan konfirmasi.',
    '/konselor'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

-- 4. Trigger: saat status booking berubah, beri tahu anggota.
CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_type  TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      v_title := 'Jadwal Konseling Dikonfirmasi'; v_type := 'booking_confirmed';
    ELSIF NEW.status = 'cancelled' THEN
      v_title := 'Jadwal Konseling Dibatalkan'; v_type := 'booking_cancelled';
    ELSIF NEW.status = 'completed' THEN
      v_title := 'Sesi Konseling Selesai'; v_type := 'booking_confirmed';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.member_id, v_type, v_title,
            'Status jadwal konseling Anda diperbarui.', '/booking');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_status_change ON public.bookings;
CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status();
