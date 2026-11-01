import type { Metadata } from "next";
import { Gallery } from "@/app/components/gallery";
import galleries from "@/app/content/galleries.json";
export const metadata: Metadata = {
    "title": "Chiara Galasi Photographer | Fotografia di ritratti: cattura l'essenza e celebra la bellezza unica di ogni individuo",
    "description": "Cattura l'essenza di una persona e celebra la bellezza unica di ogni individuo con una sessione fotografica di ritratti. Preserva i momenti più importanti della vita e sperimenta un'esperienza intima ed esclusiva che ti permetterà di esprimere la tua personalità attraverso l'immagine.",
    "alternates": {
        "canonical": "https://chiaragalasi.it/ritratti"
    }
};
export default function Page() {
    return (<Gallery {...galleries["ritratti"]} masonry={true}/>);
}
