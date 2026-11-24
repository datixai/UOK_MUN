
import Link from 'next/link';
import { Nav, WhatsApp, ProfileMenu } from '@/components/Shell';
import { getPublic } from '@/lib/data';
import Footer, { munItems } from '@/components/Footer';

export const revalidate = 60;
export const metadata = {
  title: 'UOK MUN | University of Kotli Model United Nations',
  description: 'UOK MUN: the Model United Nations conference of the University of Kotli. Register, view committees and agendas, and track your allocation.',
  icons: { icon: '/logo.png' },
  openGraph: { title: 'UOK MUN | University of Kotli Model United Nations', images: ['/logo.png'] }
};

export default async function MunLayout({ children }) {
  const { site: z } = await getPublic();
  const items = munItems(z);
  return (
    <>
        <div className="topbar noprint"><b>Official platform</b> <span className="tb-x">&nbsp;|&nbsp; University of Kotli, Azad Jammu and Kashmir &nbsp;|&nbsp; <a href="/">Department of International Relations</a></span></div>
        <header><div className="bar">
          <Link className="brand" href="/uokmun"><img src="/logo.png" alt="UOK MUN logo" />UOK <b>MUN</b></Link>
          <Nav items={items} />
          <ProfileMenu />
        </div></header>
        <main>{children}</main>
        <Footer z={z} />
        <WhatsApp contacts={z.contacts} />
    </>
  );
}
