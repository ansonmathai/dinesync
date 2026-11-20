import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'A M Foods - Takeaway',
};

export default function TakeawayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}