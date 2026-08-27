export type AppRole="customer"|"provider"|"crew"|"dispatcher"|"admin";
export type AuthUser={id:string;role:AppRole;organizationId?:string};
/** Server authorization boundary. Replace this demo null result with Supabase getUser(). */
export async function getServerUser():Promise<AuthUser|null>{return null}
export function canAccess(user:AuthUser|null,allowed:AppRole[]){return Boolean(user&&allowed.includes(user.role))}
// Phase 1 routes render a clearly labeled preview when unauthenticated. Production must
// authorize here and in Supabase RLS; hiding browser UI is never an access-control layer.
