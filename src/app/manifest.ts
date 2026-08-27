import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name:"MUBER — Move It. Remove It.", short_name:"MUBER", description:"Moving and junk removal, managed in one place.", start_url:"/", display:"standalone", background_color:"#F7F9FC", theme_color:"#102A43", icons:[{src:"/brand/muber-app-icon.png",sizes:"1254x1254",type:"image/png",purpose:"any"}] };
}
