type BrandLogoProps = {
  variant: "sidebar" | "auth";
};

const SRC = "/educahub-logo.png";
const ALT = "EducaHub Educacional";

export function BrandLogo({ variant }: BrandLogoProps) {
  return (
    <img
      src={SRC}
      alt={ALT}
      className={variant === "sidebar" ? "brand-logo brand-logo--sidebar" : "brand-logo brand-logo--auth"}
      decoding="async"
    />
  );
}
