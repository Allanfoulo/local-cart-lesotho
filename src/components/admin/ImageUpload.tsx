import { toast } from "sonner";
export function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label} (JPG, PNG or WebP, up to 1 MB)</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (
            file.size > 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type)
          ) {
            toast.error("Choose a JPG, PNG or WebP image under 1 MB.");
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => toast.error("Could not read that image.");
          reader.onload = () => onChange(String(reader.result));
          reader.readAsDataURL(file);
        }}
      />
      {value && (
        <img
          src={value}
          alt="Uploaded preview"
          style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }}
        />
      )}
    </label>
  );
}
