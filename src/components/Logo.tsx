/**
 * The samkoBuilds mark.
 *
 * The sB monogram is typographic by nature: a rounded "s" in Paper set tight
 * against a structural "B" in Signal Orange. It is drawn here with real text in
 * Montserrat so it stays razor-sharp at every size and needs no image file.
 *
 * If you want to swap in the official SVG later, replace the <span> inside
 * Monogram with your <svg> and leave everything else alone.
 *
 * Brand rules kept here: never recolour, stretch, rotate or add effects, and
 * below 32px use the monogram on its own (see variant="mark").
 */
interface LogoProps {
  /**
   * 'stack' - monogram above the wordmark (login card)
   * 'row'   - monogram beside the wordmark (app header)
   * 'mark'  - monogram only (avatars, anything under 32px)
   */
  variant?: 'stack' | 'row' | 'mark';
}

function Monogram() {
  return (
    <span className="logo__monogram" aria-hidden="true">
      <span className="logo__monogram-s">s</span>
      <span className="logo__monogram-b">B</span>
    </span>
  );
}

export function Logo({ variant = 'row' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className="logo logo--mark" role="img" aria-label="samkoBuilds">
        <Monogram />
      </span>
    );
  }

  return (
    <span className={`logo logo--${variant}`} role="img" aria-label="samkoBuilds">
      <Monogram />
      <span className="logo__wordmark" aria-hidden="true">
        samko<span className="logo__wordmark-accent">B</span>uilds
      </span>
    </span>
  );
}
