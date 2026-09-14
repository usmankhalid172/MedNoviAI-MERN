"use client";

import { useEffect } from "react";

export default function DoctorProfileLinkFix() {
  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>(
      '.landing-page a[href="/doctors/1"]',
    );
    const profileIds = ["1", "2", "3"];

    links.forEach((link, index) => {
      const profileId = profileIds[index] ?? "1";
      link.href = `/doctors/${profileId}`;

      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.assign(`/doctors/${profileId}`);
      });
    });
  }, []);

  return null;
}
