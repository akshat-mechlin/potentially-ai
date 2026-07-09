import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.addEventListener("submit",function(e){var f=e.target;if(f&&f.tagName==="FORM"&&f.hasAttribute("data-auth-form"))e.preventDefault()},true);`,
        }}
      />
      {children}
    </>
  );
}
