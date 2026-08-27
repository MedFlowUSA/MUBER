import Image from "next/image";
import Link from "next/link";
export function Logo({compact=false}:{compact?:boolean}){return <Link href="/" aria-label="MUBER home" className="inline-flex items-center"><Image src={compact?"/brand/muber-app-icon.png":"/brand/muber-primary-logo.png"} width={compact?52:210} height={compact?52:70} alt="MUBER — Move It. Remove It." priority className={compact?"rounded-xl":"h-12 w-auto"}/></Link>}
