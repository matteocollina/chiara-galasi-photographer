import type { Metadata } from "next";
export const metadata: Metadata = {
    "title": "Chiara Galasi Photographer | Contattami per un book",
    "description": "Contattami per un book fotografico per te o per la tua attività",
    "alternates": {
        "canonical": "https://chiaragalasi.it/contatti"
    }
};
export default function Page() {
    return (<div className={"site-section"}><div className={"container"}><div className={"row justify-content-center"}><div className={"col-md-7"}><div className={"row mb-5"}><div className={"col-12 "}><h2 className={"site-section-heading text-center"}>{"Contatti"}</h2></div></div></div></div><div className={"row"}><div className={"col-lg-12 ml-auto"}><div className={"mb-3 text-center"}><p className={"mb-0 font-weight-bold text-white"}>{"Numero di telefono"}</p><p className={"mb-4"}><a href={"tel:+393396049599"}>{"+39 339 60 49 599"}</a></p><p className={"mb-0 font-weight-bold text-white"}>{"E-mail"}</p><p className={"mb-0"}><a href={"mailto:chiaragalasi@icloud.com"}>{"chiaragalasi@icloud.com"}</a></p></div></div></div></div></div>);
}
