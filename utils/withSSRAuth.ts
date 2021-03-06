import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import { destroyCookie, parseCookies } from "nookies";
import  decode  from "jwt-decode";
import { AuthTokenError } from "../services/errors/AuthTokenError";
import { validateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
    permissions?: string[];
    roles?: string[];
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: WithSSRAuthOptions ) {
  return async (context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(context);
    const token = cookies['nextauth.token'];

    if(!token){
      return {
        redirect: {
          destination: '/',
          permanent: false,
        }
      }
    }

    if(options){
      const user = decode<{ permissions: string[], roles: string[] }>(token);
      const { permissions, roles } = options;

      const userHasValidPermissions = validateUserPermissions({
        user,
        permissions,
        roles
      });

      if(!userHasValidPermissions){
        return {
          // Quando não tiver permissão, envia o usuario para uma pagina onde qualquer usuario tenha acesso
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
          // notFound: true, envia isso se não tiver nenhuma 
          // página que qualquer usuario tenha permissão, assim ele envia um 404 para o usuario.
        }
      }
    }


  

    try {
      return await fn(context);
    }catch(err) {

      if(err instanceof AuthTokenError){
        destroyCookie(context, 'nextauth.token')
        destroyCookie(context, 'nextauth.refreshToken')
    
        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }
     
    }

  }
}