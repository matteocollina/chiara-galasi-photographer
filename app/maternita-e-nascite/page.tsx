import type { Metadata } from "next";
import { Gallery } from "@/app/components/gallery";
import galleries from "@/app/content/galleries.json";
export const metadata: Metadata = {
    "title": "Chiara Galasi Photographer | New born & maternity: cattura la bellezza e la forza della futura mamma",
    "description": "Mi piace riprendere l'emozione delle mamme prima del parto ed insieme alle loro creature.",
    "alternates": {
        "canonical": "https://chiaragalasi.it/maternita-e-nascite"
    }
};
export default function Page() {
    return (<Gallery {...galleries["maternita-e-nascite"]} masonry={false}/>);
}
