'use client';
import {createContext,useContext,ReactNode} from 'react';
const demoUser={id:'demo',email:'demo@example.com',displayName:'Demo User'};
const C=createContext({user:demoUser,loading:false,login:async()=>{},register:async()=>{},logout:()=>{}});
export function AuthProvider({children}:{children:ReactNode}){return <C.Provider value={{user:demoUser,loading:false,login:async()=>{},register:async()=>{},logout:()=>{}}}>{children}</C.Provider>}
export const useAuth=()=>useContext(C);
