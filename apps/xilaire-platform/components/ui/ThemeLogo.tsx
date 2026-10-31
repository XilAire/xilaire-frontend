import Image from "next/image";

type ThemeLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

/**
 * XilAire brand mark. /icon.png is the dark artwork for light surfaces;
 * /icon-light.png is the light artwork for dark surfaces.
 * The root ThemeProvider controls the document's .dark class.
 */
export default function ThemeLogo({
  size = 32,
  className = "",
  priority = false,
  alt = "XilAire Technologies",
}: ThemeLogoProps) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <Image
        src="/icon.png"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="block dark:hidden"
      />
      <Image
        src="/icon-light.png"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="hidden dark:block"
      />
    </span>
  );
}
