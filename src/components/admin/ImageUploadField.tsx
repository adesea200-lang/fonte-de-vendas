import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function extension(file: File) {
  const candidate = file.name.split(".").pop()?.toLowerCase();
  if (candidate && /^[a-z0-9]+$/.test(candidate)) return candidate;
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

async function uploadImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use uma foto JPG, PNG, WebP ou AVIF.");
  if (file.size > MAX_FILE_SIZE) throw new Error("A foto deve ter no máximo 10 MB.");

  const name = `${crypto.randomUUID()}.${extension(file)}`;
  const { error } = await supabase.storage.from("store-images").upload(name, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return `/api/public/store-images/${name}`;
}

export function ImageUploadField({
  label,
  help,
  value,
  onChange,
  multiple = false,
  className,
}: {
  label: string;
  help: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const images = Array.isArray(value) ? value : value ? [value] : [];

  async function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const selected = multiple ? Array.from(files) : [files[0]];
      const validFiles = selected.filter((file): file is File => Boolean(file));
      const uploaded = await Promise.all(validFiles.map(uploadImage));
      onChange(multiple ? [...images, ...uploaded] : (uploaded[0] ?? ""));
      toast.success(uploaded.length > 1 ? "Fotos enviadas." : "Foto enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    if (multiple) onChange(images.filter((_, imageIndex) => imageIndex !== index));
    else onChange("");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</p>
        <p className="mt-1 text-xs text-foreground/50">{help}</p>
      </div>

      {images.length ? (
        <div className={cn("grid gap-2", multiple ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-1")}>
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="group relative aspect-[4/5] max-w-48 overflow-hidden rounded-lg border border-border bg-background">
              <img src={image} alt="Foto selecionada" className="size-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeImage(index)}
                aria-label="Remover foto"
                className="absolute right-2 top-2"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          void selectFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="outline" asChild disabled={uploading}>
        <label htmlFor={inputId} className="cursor-pointer">
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {uploading ? "Enviando..." : multiple && images.length ? "Adicionar fotos" : "Escolher da galeria"}
        </label>
      </Button>
    </div>
  );
}