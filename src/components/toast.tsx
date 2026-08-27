"use client";
import { createContext, useCallback, useContext, useState } from "react";
type ToastFn=(message:string)=>void;
const Context=createContext<ToastFn>(()=>undefined);
export function ToastProvider({children}:{children:React.ReactNode}){const [message,setMessage]=useState("");const show=useCallback((m:string)=>{setMessage(m);window.setTimeout(()=>setMessage(""),3500)},[]);return <Context.Provider value={show}>{children}{message&&<div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-sm font-bold text-white shadow-lift">{message}</div>}</Context.Provider>}
export const useToast=()=>useContext(Context);
