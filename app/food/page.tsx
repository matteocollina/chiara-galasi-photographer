import type { Metadata } from "next";
import { Gallery } from "@/app/components/gallery";
import galleries from "@/app/content/galleries.json";
export const metadata: Metadata = {
    "title": "Chiara Galasi Photographer | Fotografia di cibo: creazione di immagini attraenti e invitanti per promuovere il cibo e la cucina",
    "description": "Una delle mie più grandi passioni è il cibo. Lavoro con attività della riviera romagnola e non solo.",
    "alternates": {
        "canonical": "https://chiaragalasi.it/food"
    }
};
export default function Page() {
    return (<Gallery {...galleries["food"]} masonry={false}/>);
}
