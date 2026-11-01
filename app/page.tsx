import type { Metadata } from "next";
import Image from "next/image";
export const metadata: Metadata = {
    "title": "Chiara Galasi Photographer | Sito Web ufficiale",
    "description": "Sito ufficiale di Chiara Galasi, appassionata di fotografia.",
    "alternates": {
        "canonical": "https://chiaragalasi.it/"
    }
};
export default function Page() {
    return (<div className={"container-fluid"}><div className={"row"}><div className={"col-lg-4"}><div className={"image-wrap-2"}><div className={"image-info"}><h2 className={"mb-3"}>{"Portrait"}</h2><a href={"/ritratti"} className={"btn btn-outline-white py-2 px-4"}>{"More Photos"}</a></div><Image src={"/images/Portrait/eli 1.jpg"} alt={"Portrait Photos"} className={"img-fluid"} width={2848} height={4272} sizes={"(max-width: 767px) 100vw, 50vw"}/></div></div><div className={"col-lg-4"}><div className={"image-wrap-2"}><div className={"image-info"}><h2 className={"mb-3"}>{"Maternity & New Born"}</h2><a href={"/maternita-e-nascite"} className={"btn btn-outline-white py-2 px-4"}>{"More Photos"}</a></div><Image src={"/images/Maternity%20%26%20New%20Born/3.jpg"} alt={"New Born And Maternity"} className={"img-fluid"} width={2848} height={4272} sizes={"(max-width: 767px) 100vw, 50vw"}/></div></div><div className={"col-lg-4"}><div className={"image-wrap-2"}><div className={"image-info"}><h2 className={"mb-3"}>{"Food"}</h2><a href={"/food"} className={"btn btn-outline-white py-2 px-4"}>{"More Photos"}</a></div><Image src={"/images/Food/vongole.jpg"} alt={"Food"} className={"img-fluid"} width={2848} height={4272} sizes={"(max-width: 767px) 100vw, 50vw"}/></div></div></div></div>);
}
