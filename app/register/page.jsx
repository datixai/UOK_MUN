import { getPublic } from '../../lib/data';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Register | UOK MUN' };

export default async function Register() {
  const { site: z } = await getPublic();
  return (
    <>
      <h1 className="ph">Register for UOK MUN</h1>
      {z.regOpen ? <RegisterForm note={z.regNote} /> : <div className="msg">{z.closedMsg}</div>}
    </>
  );
}
