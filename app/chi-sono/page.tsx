import type { Metadata } from "next";
import Image from "next/image";
export const metadata: Metadata = {
    "title": "Chiara Galasi | Chi sono | Fotografa professionista",
    "description": "Scopri la passione di Chiara, fotografa professionista, nel creare immagini uniche ed emozionanti che saranno tesori preziosi per sempre. Connettiti con lei per catturare i momenti speciali della tua vita.",
    "alternates": {
        "canonical": "https://chiaragalasi.it/chi-sono"
    }
};
export default function Page() {
    return (<div className={"site-section"}><div className={"container-fluid"}><div className={"row justify-content-center"}><div className={"col-md-7"}><div className={"row mb-5"}><div className={"col-12 "}><h2 className={"site-section-heading text-center"}>{"Mi presento"}</h2></div></div></div></div><div className={"row mb-5"}><div className={"col-md-7"}><Image unoptimized src={"/images/chi-sono.jpg"} alt={"Chi sono"} className={"img-fluid"} width={1280} height={1195} sizes={"(max-width: 767px) 100vw, 50vw"}/></div><div className={"col-md-4 ml-auto mt-4"}><p>{"Mi chiamo Chiara e sono una fotografa. Sono convinta che la fotografia sia uno strumento\n              meraviglioso per "}<strong>{"catturare i momenti più preziosi"}</strong>{" della vita e per celebrare la bellezza di ogni persona."}</p><p>{"\n              Ho iniziato a fotografare durante la mia adolescenza, quando mio padre mi ha regalato la mia prima macchina fotografica. Da quel\n              momento, ho scoperto una "}<strong>{"passione per la fotografia"}</strong>{" che mi ha portato a studiare e praticare costantemente, cercando\n              sempre di\n              migliorare e di esprimere la mia creatività in modo unico ed emozionante.\n            "}</p><p>{"\n              La fotografia è un modo per connettermi con le persone e per creare immagini che possano essere tesori preziosi per tutta la vita."}</p></div></div></div></div>);
}
