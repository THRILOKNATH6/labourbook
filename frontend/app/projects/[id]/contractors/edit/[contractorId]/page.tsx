import ClientPage from './page.client';

export function generateStaticParams() {
  return [{"id":"1","contractorId":"1"}];
}

export default function Page() {
  return <ClientPage />;
}
