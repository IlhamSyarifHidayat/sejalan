import React, { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileContainer from "../components/MobileContainer";
import FloatingHearts from "../components/FloatingHearts";
import { useSejalan } from "../context/SejalanContext";
import { supabase, isSupabaseReady, STORAGE_BUCKET } from "../lib/supabase";
import {
  ArrowLeft,
  Play,
  Upload as UploadIcon,
  Heart,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height / width) * maxDim);
            width = maxDim;
          } else {
            width = Math.round((width / height) * maxDim);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Compress fail"))),
          "image/jpeg",
          0.78
        );
      };
      img.onerror = () => reject(new Error("Image error"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Read error"));
    reader.readAsDataURL(file);
  });

const Gallery = () => {
  const navigate = useNavigate();
  const { inRoom, username, inviteCode, persistPatch } = useSejalan();
  const [photos, setPhotos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fsIndex, setFsIndex] = useState(-1);
  const [slideshow, setSlideshow] = useState(false);
  const fileInputRef = useRef(null);
  const slideshowTimer = useRef(null);
  const photosChannelRef = useRef(null);

  const fetchPhotos = useCallback(async () => {
    if (!isSupabaseReady() || !inviteCode) return [];
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("couple_code", inviteCode)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((p) => ({
      ...p,
      public_url:
        supabase.storage.from(STORAGE_BUCKET).getPublicUrl(p.file_path).data?.publicUrl || "",
    }));
  }, [inviteCode]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const arr = await fetchPhotos();
    setPhotos(arr);
    setLoading(false);
  }, [fetchPhotos]);

  useEffect(() => {
    if (inviteCode) loadPhotos();
  }, [loadPhotos, inviteCode]);

  // Realtime photos
  useEffect(() => {
    if (!isSupabaseReady() || !inviteCode) return;
    if (photosChannelRef.current) supabase.removeChannel(photosChannelRef.current);
    const ch = supabase
      .channel(`photos-${inviteCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photos",
          filter: `couple_code=eq.${inviteCode}`,
        },
        () => loadPhotos()
      )
      .subscribe();
    photosChannelRef.current = ch;
    return () => {
      if (photosChannelRef.current) supabase.removeChannel(photosChannelRef.current);
      photosChannelRef.current = null;
    };
  }, [loadPhotos, inviteCode]);

  // Keyboard navigation (above early returns)
  useEffect(() => {
    const onKey = (e) => {
      if (fsIndex < 0) return;
      if (e.key === "Escape") {
        setFsIndex(-1);
        document.body.style.overflow = "";
      }
      const len = (filter === "favorites" ? photos.filter((p) => p.is_favorite) : photos).length;
      if (e.key === "ArrowLeft" && len > 0) setFsIndex((i) => (i - 1 + len) % len);
      if (e.key === "ArrowRight" && len > 0) setFsIndex((i) => (i + 1) % len);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fsIndex, photos, filter]);

  if (!inRoom) return <Navigate to="/auth" replace />;

  const filtered = filter === "favorites" ? photos.filter((p) => p.is_favorite) : photos;

  const handleFiles = async (files) => {
    if (!isSupabaseReady()) {
      toast.error("Supabase belum siap — upload tidak tersedia.");
      return;
    }
    if (!files || !files.length) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} > 20MB, dilewati`);
        continue;
      }
      try {
        setProgress(15);
        const compressed = await compressImage(file);
        setProgress(45);
        const path = `${inviteCode}/${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, compressed, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) throw upErr;
        setProgress(80);
        await supabase.from("photos").insert({
          couple_code: inviteCode,
          uploaded_by: username,
          file_path: path
        });
        setProgress(100);
        await persistPatch({
          partner_activity: `📸 ${username} mengupload foto baru ke galeri`,
        });
        toast.success("Foto ter-upload 💖");
      } catch (err) {
        toast.error(`Upload gagal: ${err?.message || "coba lagi"}`);
      }
    }
    setUploading(false);
    setProgress(0);
    loadPhotos();
  };

  const toggleFavorite = async (photo) => {
    const newFav = !photo.is_favorite;
    setPhotos((arr) =>
      arr.map((p) => (p.id === photo.id ? { ...p, is_favorite: newFav } : p))
    );
    if (isSupabaseReady()) {
      const { error } = await supabase
        .from("photos")
        .update({ is_favorite: newFav, updated_at: new Date().toISOString() })
        .eq("id", photo.id);
      if (error) {
        setPhotos((arr) =>
          arr.map((p) => (p.id === photo.id ? { ...p, is_favorite: !newFav } : p))
        );
        toast.error("Gagal update favorit");
      }
    }
  };

const deletePhoto = async (photo) => {

   if (!supabase) return;

   try {

      console.log("DELETE PHOTO:", photo);

      const { data: storageData, error: storageErr } =
         await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([photo.file_path]);

      console.log("STORAGE:", storageData, storageErr);

      const { data: dbData, error: dbErr } =
         await supabase
            .from("photos")
            .delete()
            .eq("id", photo.id)
            .select();

      console.log("DB:", dbData, dbErr);

      if (storageErr) throw storageErr;
      if (dbErr) throw dbErr;

      toast.success("Foto dihapus 💔");

      loadPhotos();

   } catch (err) {

      console.error(err);

      toast.error(err.message || "Gagal hapus");
   }
};

  const openFullscreen = (idx) => {
    setFsIndex(idx);
    document.body.style.overflow = "hidden";
  };
  const closeFullscreen = () => {
    setFsIndex(-1);
    document.body.style.overflow = "";
    stopSlideshow();
  };
  const navFs = (dir) => {
    if (filtered.length === 0) return;
    setFsIndex((i) => (i + dir + filtered.length) % filtered.length);
  };
  const startSlideshow = () => {
    if (filtered.length <= 1) {
      toast.info("Butuh minimal 2 foto");
      return;
    }
    setSlideshow(true);
    slideshowTimer.current = setInterval(() => navFs(1), 3000);
  };
  const stopSlideshow = () => {
    setSlideshow(false);
    if (slideshowTimer.current) {
      clearInterval(slideshowTimer.current);
      slideshowTimer.current = null;
    }
  };

  const current = fsIndex >= 0 && fsIndex < filtered.length ? filtered[fsIndex] : null;

  return (
    <MobileContainer className="pb-12">
      <div className="absolute inset-0 -z-10 sj-bg" aria-hidden="true" />
      <FloatingHearts count={8} />

      <div className="relative z-10 px-5 pt-6">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              data-testid="gallery-back-btn"
              className="w-10 h-10 rounded-2xl glass-soft flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="font-heading font-semibold text-[20px] text-[#2D2640] dark:text-[#F8F4FF]">
              Memori Kita <span className="sj-logo-gradient font-logo">💖</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (filtered.length === 0) {
                  toast.info("Upload foto dulu sebelum slideshow 💖");
                  return;
                }
                openFullscreen(0);
                setTimeout(startSlideshow, 200);
              }}
              data-testid="gallery-slideshow-btn"
              aria-label="Slideshow"
              className="w-10 h-10 rounded-2xl glass-soft flex items-center justify-center text-[#6E628A] dark:text-[#F8F4FF] hover:scale-105 active:scale-95 transition-all"
            >
              <Play size={16} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              data-testid="gallery-upload-btn"
              aria-label="Upload"
              className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#FF8FB9] to-[#B892FF] flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <UploadIcon size={16} />
            </button>
          </div>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          data-testid="gallery-dropzone"
          className={`glass-card p-6 mb-4 text-center cursor-pointer border-2 border-dashed transition-all ${
            dragOver
              ? "border-[#B892FF] bg-[#B892FF]/10 scale-[1.02]"
              : "border-white/60 dark:border-white/15"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD6E2] to-[#E0CCFF] dark:from-[#3a2347] dark:to-[#2a1838] flex items-center justify-center mx-auto mb-3">
            <Camera size={26} className="text-[#E284BC]" />
          </div>
          <div className="font-heading font-semibold text-[15px] text-[#2D2640] dark:text-[#F8F4FF]">
            Tambah Foto Memori
          </div>
          <div className="text-[12px] text-[#6E628A] dark:text-[#A295B8] mt-1">
            Klik atau drag &amp; drop foto di sini
          </div>
          {uploading && (
            <div className="mt-3">
              <div className="w-full h-1.5 rounded-full bg-white/40 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8FB9] to-[#B892FF] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[11px] text-[#6E628A] dark:text-[#A295B8] mt-2">
                Mengupload... {progress}%
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="gallery-file-input"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilter("all")}
            data-testid="filter-all"
            className={`px-4 py-2 rounded-full text-[12.5px] font-medium transition-all ${
              filter === "all"
                ? "bg-gradient-to-r from-[#FF8FB9] to-[#B892FF] text-white shadow-md"
                : "glass-soft text-[#6E628A] dark:text-[#F8F4FF]"
            }`}
          >
            🌟 Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter("favorites")}
            data-testid="filter-favorites"
            className={`px-4 py-2 rounded-full text-[12.5px] font-medium transition-all ${
              filter === "favorites"
                ? "bg-gradient-to-r from-[#FF8FB9] to-[#B892FF] text-white shadow-md"
                : "glass-soft text-[#6E628A] dark:text-[#F8F4FF]"
            }`}
          >
            ❤️ Favorit
          </button>
        </div>

        {/* Photo grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl glass-soft animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📸</div>
            <h3 className="font-heading font-semibold text-[17px] text-[#2D2640] dark:text-[#F8F4FF] mb-1">
              Belum ada foto
            </h3>
            <p className="text-[13px] text-[#6E628A] dark:text-[#A295B8] leading-relaxed max-w-[260px] mx-auto">
              Upload foto pertama kalian dan mulai membangun galeri memori 💖
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5" data-testid="photo-grid">
            {filtered.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => openFullscreen(idx)}
                data-testid={`photo-card-${idx}`}
                className="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer glass-soft hover:scale-[1.03] active:scale-95 transition-transform"
              >
                <img
                  src={p.public_url}
                  alt={p.caption || "memory"}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p);
                  }}
                  data-testid={`fav-${idx}`}
                  aria-label="Toggle favorite"
                  className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full backdrop-blur flex items-center justify-center transition-all ${
                    p.is_favorite
                      ? "bg-rose-500 text-white scale-110"
                      : "bg-black/40 text-white hover:bg-black/60"
                  }`}
                >
                  <Heart size={13} className={p.is_favorite ? "fill-white" : ""} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-[12px] text-[#8a7da3] dark:text-[#9F90BC] pt-6 pb-2">
          Setiap foto adalah cerita 💖
        </div>
      </div>

      {/* Fullscreen overlay */}
      {current && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          onClick={closeFullscreen}
          data-testid="fullscreen-overlay"
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-white/70 text-[12px]" data-testid="fullscreen-counter">
              {fsIndex + 1} / {filtered.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeFullscreen();
              }}
              data-testid="fullscreen-close"
              className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center relative px-3"
            onClick={(e) => e.stopPropagation()}
          >
            {filtered.length > 1 && (
              <button
                type="button"
                onClick={() => navFs(-1)}
                data-testid="fullscreen-prev"
                className="absolute left-2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <img
              src={current.public_url}
              alt={current.caption || "memory"}
              className="max-w-[92vw] max-h-[65vh] object-contain rounded-2xl"
            />
            {filtered.length > 1 && (
              <button
                type="button"
                onClick={() => navFs(1)}
                data-testid="fullscreen-next"
                className="absolute right-2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>
          <div
            className="p-5 flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white text-center text-[14px] max-w-[420px]">
              {current.caption || "Tanpa caption 💖"} · oleh{" "}
              <span className="font-semibold">{current.uploaded_by}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => toggleFavorite(current)}
                data-testid="fullscreen-fav"
                className={`px-4 py-2 rounded-full text-white text-[13px] font-medium transition-all ${
                  current.is_favorite ? "bg-rose-500" : "bg-white/15 hover:bg-white/25"
                }`}
              >
                <Heart
                  size={14}
                  className={`inline mr-1 ${current.is_favorite ? "fill-white" : ""}`}
                />
                Favorit
              </button>
              <button
                type="button"
                onClick={() => (slideshow ? stopSlideshow() : startSlideshow())}
                data-testid="fullscreen-slideshow"
                className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-[13px] font-medium"
              >
                {slideshow ? (
                  <>
                    <Pause size={13} className="inline mr-1" /> Stop
                  </>
                ) : (
                  <>
                    <Play size={13} className="inline mr-1" /> Slideshow
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => deletePhoto(current)}
                data-testid="fullscreen-delete"
                className="px-4 py-2 rounded-full bg-rose-500/40 hover:bg-rose-500 text-white text-[13px] font-medium"
              >
                <Trash2 size={13} className="inline mr-1" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  );
};

export default Gallery;
