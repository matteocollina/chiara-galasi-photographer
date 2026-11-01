"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
const links = [["/", "Home"], ["/chi-sono", "Chi sono"], ["/contatti", "Contatti"], ["/faq", "FAQ"]];
export function Header() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = panel.current;
        if (open)
            dialog?.showModal();
        else
            dialog?.close();
    }, [open]);
    const navigation = (mobile = false) => <ul className={mobile ? "site-nav-wrap" : "site-menu mx-auto d-none d-lg-block"}>
    {links.map(([href, label]) => <li key={href} className={pathname === href ? "active" : ""}><Link href={href} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}>{label}</Link></li>)}
  </ul>;
    const instagram = <a href="https://www.instagram.com/chiara.galasi.photography" target="_blank" rel="noopener noreferrer" aria-label="Instagram di Chiara Galasi" className="pl-3 pr-3"><span className="icon-instagram" aria-hidden="true"/></a>;
    return <>
    <header className="site-navbar py-3">
      <div className="container-fluid"><div className="row align-items-center">
        <div className="col-6 col-xl-3"><h1 className="mb-0"><Link href="/" className="text-white h2 mb-0">Chiara Galasi <span style={{ fontSize: 14 }}>photography</span></Link></h1></div>
        <div className="col-10 col-md-8 col-xl-7 d-none d-xl-block"><nav aria-label="Navigazione principale" className="site-navigation position-relative text-right text-lg-center">{navigation()}</nav></div>
        <div className="col-6 col-xl-2 text-right"><div className="d-none d-xl-inline-block">{instagram}</div><button ref={toggle} type="button" className="menu-toggle d-inline-block d-xl-none py-3" aria-label="Apri menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}><span className="icon-menu h3" aria-hidden="true"/></button></div>
      </div></div>
    </header>
    <dialog ref={panel} id="mobile-menu" className="mobile-dialog" onCancel={() => setOpen(false)} onClose={() => { setOpen(false); toggle.current?.focus(); }} onClick={event => { if (event.target === panel.current)
        setOpen(false); }}>
      <button className="menu-close" aria-label="Chiudi menu" onClick={() => setOpen(false)}>×</button>
      <nav aria-label="Navigazione mobile">{navigation(true)}</nav>{instagram}
    </dialog>
  </>;
}
